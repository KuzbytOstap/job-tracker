import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  listCvs: vi.fn(),
  createCv: vi.fn(),
  importCvForUpload: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/cv-service", () => ({
  listCvs: (...args: unknown[]) => mocks.listCvs(...args),
  createCv: (...args: unknown[]) => mocks.createCv(...args),
}));
vi.mock("@/lib/profile/cv-import-service", () => ({
  importCvForUpload: (...args: unknown[]) => mocks.importCvForUpload(...args),
}));

import { ProfileInputError } from "@/lib/profile/errors";
import { CV_MAX_BYTES } from "@/lib/profile/limits";
import { GET, POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const CV = { id: "cv_1", label: "RN", isPrimary: true, hasText: true };
const RESULT = { cv: CV, textStatus: "extracted", identitySuggestions: null, skippedReason: null };

function pdf(size = 64, name = "cv.pdf") {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

function upload(fields: { file?: File; label?: string; language?: string }) {
  const form = new FormData();
  if (fields.file) form.set("file", fields.file);
  if (fields.label !== undefined) form.set("label", fields.label);
  if (fields.language !== undefined) form.set("language", fields.language);
  return new NextRequest("http://localhost:3000/api/profile/cvs", { method: "POST", body: form });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/profile/cvs", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await GET()).status).toBe(401);
    expect(mocks.listCvs).not.toHaveBeenCalled();
  });

  it("lists the signed in user's CVs", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.listCvs.mockResolvedValue([CV]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([CV]);
    expect(mocks.listCvs).toHaveBeenCalledWith("test-user-id");
  });
});

describe("POST /api/profile/cvs", () => {
  it("returns 401 before reading the upload when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await POST(upload({ file: pdf(), label: "RN" }))).status).toBe(401);
    expect(mocks.createCv).not.toHaveBeenCalled();
  });

  it("returns 400 for a JSON body, a missing file, or a missing or blank label", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    const jsonRequest = new NextRequest("http://localhost:3000/api/profile/cvs", {
      method: "POST",
      body: JSON.stringify({ label: "RN" }),
      headers: { "content-type": "application/json" },
    });

    expect((await POST(jsonRequest)).status).toBe(400);
    expect((await POST(upload({ label: "RN" }))).status).toBe(400);
    expect((await POST(upload({ file: pdf() }))).status).toBe(400);
    expect((await POST(upload({ file: pdf(), label: "   " }))).status).toBe(400);
    expect(mocks.createCv).not.toHaveBeenCalled();
  });

  it("returns 413 for a file over 4 MB without creating anything", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    const response = await POST(upload({ file: pdf(CV_MAX_BYTES + 1), label: "RN" }));

    expect(response.status).toBe(413);
    expect(mocks.createCv).not.toHaveBeenCalled();
  });

  it("creates the CV for the signed in user, imports its text and returns 201", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createCv.mockResolvedValue(CV);
    mocks.importCvForUpload.mockResolvedValue(RESULT);

    const response = await POST(upload({ file: pdf(64, "cv.pdf"), label: "  RN  ", language: "en" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(RESULT);
    const [userId, input] = mocks.createCv.mock.calls[0];
    expect(userId).toBe("test-user-id");
    expect(input).toMatchObject({ label: "RN", language: "en", fileName: "cv.pdf" });
    expect(input.bytes).toBeInstanceOf(Uint8Array);
    expect(input.bytes.byteLength).toBe(64);
    expect(mocks.importCvForUpload).toHaveBeenCalledWith("test-user-id", "cv_1");
  });

  it("stores no language when none is sent and strips directories from the file name", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createCv.mockResolvedValue(CV);
    mocks.importCvForUpload.mockResolvedValue(RESULT);

    await POST(upload({ file: pdf(8, "../../etc/cv.pdf"), label: "RN" }));

    expect(mocks.createCv.mock.calls[0][1]).toMatchObject({ language: null, fileName: "cv.pdf" });
  });

  it("still returns 201 with a missing text status when AI is unavailable", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createCv.mockResolvedValue(CV);
    mocks.importCvForUpload.mockResolvedValue({
      cv: { ...CV, hasText: false },
      textStatus: "missing",
      identitySuggestions: null,
      skippedReason: "AI_ACCESS_REQUIRED",
    });

    const response = await POST(upload({ file: pdf(), label: "RN" }));

    expect(response.status).toBe(201);
    expect((await response.json()).textStatus).toBe("missing");
  });

  it("maps a non PDF to 415 and a full CV list to 409", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    mocks.createCv.mockRejectedValueOnce(new ProfileInputError("CV_NOT_PDF"));
    expect((await POST(upload({ file: pdf(), label: "RN" }))).status).toBe(415);

    mocks.createCv.mockRejectedValueOnce(new ProfileInputError("CV_LIMIT"));
    const limited = await POST(upload({ file: pdf(), label: "RN" }));
    expect(limited.status).toBe(409);
    expect((await limited.json()).details).toEqual({ code: "CV_LIMIT" });
    expect(mocks.importCvForUpload).not.toHaveBeenCalled();
  });

  it("returns 404 if the CV vanished before the import finished", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createCv.mockResolvedValue(CV);
    mocks.importCvForUpload.mockResolvedValue(null);

    expect((await POST(upload({ file: pdf(), label: "RN" }))).status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createCv.mockRejectedValue(new Error("db down"));

    expect((await POST(upload({ file: pdf(), label: "RN" }))).status).toBe(500);
  });
});
