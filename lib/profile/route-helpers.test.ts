import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ProfileInputError, type ProfileInputErrorCode } from "@/lib/profile/errors";
import { parseJsonBody, profileInputErrorResponse } from "@/lib/profile/route-helpers";

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
