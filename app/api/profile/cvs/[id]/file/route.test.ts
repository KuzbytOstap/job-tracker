import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  getCvFile: vi.fn(),
  replaceCvFile: vi.fn(),
  importCvForUpload: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/cv-service", () => ({
  getCvFile: (...args: unknown[]) => mocks.getCvFile(...args),
  replaceCvFile: (...args: unknown[]) => mocks.replaceCvFile(...args),
}));
vi.mock("@/lib/profile/cv-import-service", () => ({
  importCvForUpload: (...args: unknown[]) => mocks.importCvForUpload(...args),
}));

import { ProfileInputError } from "@/lib/profile/errors";
import { CV_MAX_BYTES } from "@/lib/profile/limits";
import { GET, PUT } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const params = Promise.resolve({ id: "cv_1" });
const RESULT = { cv: { id: "cv_1" }, textStatus: "extracted", identitySuggestions: null, skippedReason: null };

function getRequest() {
  return new NextRequest("http://localhost:3000/api/profile/cvs/cv_1/file");
}

function putRequest(file?: File) {
  const form = new FormData();
  if (file) form.set("file", file);
  return new NextRequest("http://localhost:3000/api/profile/cvs/cv_1/file", { method: "PUT", body: form });
}

function pdf(size = 32, name = "new.pdf") {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/profile/cvs/[id]/file", () => {
  it("returns 401 before reading the file when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await GET(getRequest(), { params })).status).toBe(401);
    expect(mocks.getCvFile).not.toHaveBeenCalled();
  });

  it("returns 404 for another user's or a missing CV", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.getCvFile.mockResolvedValue(null);

    expect((await GET(getRequest(), { params })).status).toBe(404);
    expect(mocks.getCvFile).toHaveBeenCalledWith("test-user-id", "cv_1");
  });

  it("streams the PDF as a private, non cached attachment", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.getCvFile.mockResolvedValue({ fileName: "Резюме.pdf", bytes: Buffer.from("%PDF-1.7 test") });

    const response = await GET(getRequest(), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Length")).toBe("13");
    expect(response.headers.get("Content-Disposition")).toContain("attachment;");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("%PDF-1.7 test");
  });
});

describe("PUT /api/profile/cvs/[id]/file", () => {
  it("returns 401 before reading the upload when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await PUT(putRequest(pdf()), { params })).status).toBe(401);
    expect(mocks.replaceCvFile).not.toHaveBeenCalled();
  });

  it("returns 400 when no file is sent and 413 when it is over 4 MB", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await PUT(putRequest(), { params })).status).toBe(400);
    expect((await PUT(putRequest(pdf(CV_MAX_BYTES + 1)), { params })).status).toBe(413);
    expect(mocks.replaceCvFile).not.toHaveBeenCalled();
  });

  it("replaces the file for the signed in user and returns the refreshed import result", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.replaceCvFile.mockResolvedValue({ id: "cv_1" });
    mocks.importCvForUpload.mockResolvedValue(RESULT);

    const response = await PUT(putRequest(pdf(32, "new.pdf")), { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(RESULT);
    const [userId, cvId, input] = mocks.replaceCvFile.mock.calls[0];
    expect([userId, cvId]).toEqual(["test-user-id", "cv_1"]);
    expect(input.fileName).toBe("new.pdf");
    expect(input.bytes.byteLength).toBe(32);
    expect(mocks.importCvForUpload).toHaveBeenCalledWith("test-user-id", "cv_1");
  });

  it("returns 404 for another user's CV without importing anything", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.replaceCvFile.mockResolvedValue(null);

    expect((await PUT(putRequest(pdf()), { params })).status).toBe(404);
    expect(mocks.importCvForUpload).not.toHaveBeenCalled();
  });

  it("maps a non PDF to 415", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.replaceCvFile.mockRejectedValue(new ProfileInputError("CV_NOT_PDF"));

    expect((await PUT(putRequest(pdf()), { params })).status).toBe(415);
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.replaceCvFile.mockRejectedValue(new Error("db down"));

    expect((await PUT(putRequest(pdf()), { params })).status).toBe(500);
  });
});
