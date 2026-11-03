import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ProfileInputError, type ProfileInputErrorCode } from "@/lib/profile/errors";
import { CV_MAX_BYTES } from "@/lib/profile/limits";
import {
  contentDispositionAttachment,
  parseJsonBody,
  profileInputErrorResponse,
  readUpload,
  sanitizeFileName,
} from "@/lib/profile/route-helpers";

const schema = z.object({ name: z.string().trim().min(1) }).strict();

function request(body: string) {
  return new NextRequest("http://localhost/api/test", { method: "POST", body });
}

describe("parseJsonBody", () => {
  it("returns a 400 response for a body that is not JSON", async () => {
    const result = await parseJsonBody(request("{not json"), schema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect(await result.response.json()).toEqual({ error: "Invalid JSON body" });
    }
  });

  it("returns a 400 response with the issues for a body that fails validation", async () => {
    const result = await parseJsonBody(request(JSON.stringify({ name: "  " })), schema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect((await result.response.json()).error).toBe("Invalid request");
    }
  });

  it("returns the parsed and normalized data on success", async () => {
    const result = await parseJsonBody(request(JSON.stringify({ name: "  Ada  " })), schema);

    expect(result).toEqual({ ok: true, data: { name: "Ada" } });
  });
});

describe("profileInputErrorResponse", () => {
  const CASES: Array<[ProfileInputErrorCode, number]> = [
    ["CV_NOT_PDF", 415],
    ["CV_TOO_LARGE", 413],
    ["CV_LIMIT", 409],
    ["EXAMPLE_LIMIT", 409],
  ];

  it.each(CASES)("maps %s to status %i with the code in details", async (code, status) => {
    const response = profileInputErrorResponse(new ProfileInputError(code));

    expect(response.status).toBe(status);
    expect((await response.json()).details).toEqual({ code });
  });
});

function multipart(entries: Record<string, string | File>) {
  const form = new FormData();
  Object.entries(entries).forEach(([key, value]) => form.set(key, value));
  return new NextRequest("http://localhost/api/test", { method: "POST", body: form });
}

describe("readUpload", () => {
  it("returns 400 when the body is not multipart form data", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const result = await readUpload(request);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("returns 400 when the file field is missing or is plain text", async () => {
    for (const entries of [{ label: "x" }, { file: "not a file" }]) {
      const result = await readUpload(multipart(entries));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(400);
    }
  });

  it("returns 413 for a file over 4 MB without reading it", async () => {
    const big = new File([new Uint8Array(CV_MAX_BYTES + 1)], "big.pdf", { type: "application/pdf" });

    const result = await readUpload(multipart({ file: big }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
      expect((await result.response.json()).details).toEqual({ code: "CV_TOO_LARGE" });
    }
  });

  it("returns the form and the file otherwise", async () => {
    const file = new File([new Uint8Array(8)], "cv.pdf", { type: "application/pdf" });

    const result = await readUpload(multipart({ file, label: "RN" }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.name).toBe("cv.pdf");
      expect(result.form.get("label")).toBe("RN");
    }
  });
});

describe("sanitizeFileName", () => {
  it("keeps only the base name and drops directory parts", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFileName("C:\\Users\\me\\cv.pdf")).toBe("cv.pdf");
  });

  it("removes control characters including line breaks", () => {
    expect(sanitizeFileName("cv\r\nSet-Cookie: x.pdf")).toBe("cvSet-Cookie: x.pdf");
  });

  it("limits the length and falls back to cv.pdf when nothing is left", () => {
    expect(sanitizeFileName("a".repeat(300)).length).toBe(200);
    expect(sanitizeFileName("   ")).toBe("cv.pdf");
    expect(sanitizeFileName("")).toBe("cv.pdf");
  });
});

describe("contentDispositionAttachment", () => {
  it("builds an attachment header with an ASCII fallback and an encoded UTF-8 name", () => {
    expect(contentDispositionAttachment("Резюме Ostap.pdf")).toBe(
      "attachment; filename=\"______ Ostap.pdf\"; filename*=UTF-8''%D0%A0%D0%B5%D0%B7%D1%8E%D0%BC%D0%B5%20Ostap.pdf",
    );
  });

  it("neutralizes quotes and characters that could break out of the header value", () => {
    const header = contentDispositionAttachment('a"b\\c\'(1).pdf');

    expect(header).toContain('filename="a_b_c\'(1).pdf"');
    expect(header).toContain("filename*=UTF-8''a%22b%5Cc%27%281%29.pdf");
    expect(header).not.toMatch(/[\r\n]/);
  });
});
