import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCvFile: vi.fn(),
  setCvText: vi.fn(),
  runProfileOperation: vi.fn(),
}));

vi.mock("@/lib/profile/cv-service", () => ({
  getCvFile: (...args: unknown[]) => mocks.getCvFile(...args),
  setCvText: (...args: unknown[]) => mocks.setCvText(...args),
}));

vi.mock("@/lib/profile/run-profile-ai", () => ({
  runProfileOperation: (...args: unknown[]) => mocks.runProfileOperation(...args),
}));

import { importCvText } from "@/lib/profile/cv-import-service";

const IDENTITY = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: null, city: "Lviv" };

beforeEach(() => {
  mocks.getCvFile.mockReset();
  mocks.setCvText.mockReset();
  mocks.runProfileOperation.mockReset();
  mocks.getCvFile.mockResolvedValue({ fileName: "cv.pdf", bytes: Buffer.from("ABC") });
  mocks.setCvText.mockResolvedValue({ id: "cv_1" });
});

describe("importCvText", () => {
  it("sends the stored PDF as base64 with its file name through the extractCv operation", async () => {
    mocks.runProfileOperation.mockResolvedValue({ ok: true, result: { text: "CV text", identity: IDENTITY } });

    await importCvText("user_1", "cv_1");

    const params = mocks.runProfileOperation.mock.calls[0][0];
    expect(params.userId).toBe("user_1");
    expect(params.input).toEqual({ fileName: "cv.pdf", pdfBase64: "QUJD" });
    expect(params.select({ extractCv: "extract-operation" })).toBe("extract-operation");
  });

  it("stores the text and returns the identity suggestions with empty strings turned into null", async () => {
    mocks.runProfileOperation.mockResolvedValue({
      ok: true,
      result: { text: "CV text", identity: { ...IDENTITY, lastName: "", phone: "  " } },
    });

    const result = await importCvText("user_1", "cv_1");

    expect(mocks.setCvText).toHaveBeenCalledWith("user_1", "cv_1", "CV text");
    expect(result).toEqual({
      status: "extracted",
      identity: { firstName: "Ada", lastName: null, email: "ada@example.com", phone: null, city: "Lviv" },
    });
  });

  it("returns skipped with the reason and stores nothing when AI access is missing", async () => {
    mocks.runProfileOperation.mockResolvedValue({ ok: false, reason: "AI_ACCESS_REQUIRED" });

    await expect(importCvText("user_1", "cv_1")).resolves.toEqual({
      status: "skipped",
      reason: "AI_ACCESS_REQUIRED",
    });
    expect(mocks.setCvText).not.toHaveBeenCalled();
  });

  it("returns skipped PROVIDER_FAILED when the provider fails, leaving the CV untouched", async () => {
    mocks.runProfileOperation.mockResolvedValue({ ok: false, reason: "PROVIDER_FAILED" });

    await expect(importCvText("user_1", "cv_1")).resolves.toEqual({ status: "skipped", reason: "PROVIDER_FAILED" });
    expect(mocks.setCvText).not.toHaveBeenCalled();
  });

  it("returns CV_NOT_FOUND without calling AI when the CV does not belong to the user", async () => {
    mocks.getCvFile.mockResolvedValue(null);

    await expect(importCvText("user_2", "cv_1")).resolves.toEqual({ status: "skipped", reason: "CV_NOT_FOUND" });
    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
  });

  it("returns CV_NOT_FOUND when the CV disappears before the text is saved", async () => {
    mocks.runProfileOperation.mockResolvedValue({ ok: true, result: { text: "CV text", identity: IDENTITY } });
    mocks.setCvText.mockResolvedValue(null);

    await expect(importCvText("user_1", "cv_1")).resolves.toEqual({ status: "skipped", reason: "CV_NOT_FOUND" });
  });
});
