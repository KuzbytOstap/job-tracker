import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { createTranslator } from "@/lib/i18n/translate";

const en = createTranslator("en");
const uk = createTranslator("uk");

describe("getApiErrorMessage", () => {
  it("uses the fallback for non-ApiError values", () => {
    expect(getApiErrorMessage(en, new Error("boom"), "errors.saveFailed")).toBe("Couldn't save changes. Try again.");
    expect(getApiErrorMessage(en, "boom", "errors.saveFailed")).toBe("Couldn't save changes. Try again.");
  });

  it("localizes known HTTP statuses instead of showing the server text", () => {
    expect(getApiErrorMessage(en, new ApiError(401, "Unauthorized"), "errors.saveFailed")).toBe(
      "Your session expired. Sign in again.",
    );
    expect(getApiErrorMessage(uk, new ApiError(404, "Application not found"), "errors.saveFailed")).toBe(
      "Цього елемента більше не існує.",
    );
    expect(getApiErrorMessage(en, new ApiError(429, "slow down"), "errors.saveFailed")).toBe(
      "Too many requests. Try again in a moment.",
    );
  });

  it("maps gateway statuses to the unavailable message", () => {
    for (const status of [502, 503, 504]) {
      expect(getApiErrorMessage(en, new ApiError(status, "x"), "errors.saveFailed")).toBe(
        "The service is temporarily unavailable. Try again.",
      );
    }
  });

  it("prefers a known error code over the status", () => {
    const error = new ApiError(429, "limit", { code: "VACANCY_LIMIT_REACHED" });
    expect(getApiErrorMessage(en, error, "errors.saveFailed")).toBe("The daily vacancy analysis limit is reached.");
    expect(getApiErrorMessage(uk, error, "errors.saveFailed")).toBe("Досягнуто денний ліміт аналізу вакансій.");
  });

  it("maps PROFILE_LIMIT_REACHED to a localized message", () => {
    const error = new ApiError(429, "limit", { code: "PROFILE_LIMIT_REACHED" });
    expect(getApiErrorMessage(en, error, "errors.saveFailed")).toBe("The daily profile AI limit is reached.");
    expect(getApiErrorMessage(uk, error, "errors.saveFailed")).toBe("Досягнуто денний ліміт AI для профілю.");
  });

  it("maps COVER_LETTER_LIMIT_REACHED to a localized message", () => {
    const error = new ApiError(429, "limit", { code: "COVER_LETTER_LIMIT_REACHED" });
    expect(getApiErrorMessage(en, error, "errors.saveFailed")).toBe("The daily cover letter limit is reached.");
    expect(getApiErrorMessage(uk, error, "errors.saveFailed")).toBe("Досягнуто денний ліміт листів.");
  });

  it("maps FIT_ANALYSIS_LIMIT_REACHED to a localized message", () => {
    const error = new ApiError(429, "limit", { code: "FIT_ANALYSIS_LIMIT_REACHED" });
    expect(getApiErrorMessage(en, error, "errors.saveFailed")).toBe("The daily fit analysis limit is reached.");
    expect(getApiErrorMessage(uk, error, "errors.saveFailed")).toBe("Досягнуто денний ліміт аналізів відповідності.");
  });

  it("localizes the CV and example limit codes ahead of the generic status text", () => {
    expect(getApiErrorMessage(en, new ApiError(415, "x", { code: "CV_NOT_PDF" }), "errors.saveFailed")).toBe(
      "Only PDF files are accepted.",
    );
    expect(getApiErrorMessage(uk, new ApiError(413, "x", { code: "CV_TOO_LARGE" }), "errors.saveFailed")).toBe(
      "Файл більший за 4 МБ.",
    );
    expect(getApiErrorMessage(en, new ApiError(409, "x", { code: "CV_LIMIT" }), "errors.saveFailed")).toBe(
      "You've reached the limit of stored CVs.",
    );
    expect(getApiErrorMessage(uk, new ApiError(409, "x", { code: "EXAMPLE_LIMIT" }), "errors.saveFailed")).toBe(
      "Досягнуто ліміт збережених прикладів.",
    );
  });

  it("falls back to the status when the code is unknown", () => {
    const error = new ApiError(403, "no", { code: "SOMETHING_ELSE" });
    expect(getApiErrorMessage(en, error, "errors.saveFailed")).toBe("You don't have access to this.");
  });

  it("falls back to the provided message for unmapped statuses", () => {
    expect(getApiErrorMessage(en, new ApiError(400, "Invalid request"), "errors.createFailed")).toBe(
      "Couldn't create the application. Try again.",
    );
    expect(getApiErrorMessage(en, new ApiError(500, "Internal server error"), "errors.deleteFailed")).toBe(
      "Couldn't delete the application. Try again.",
    );
  });
});
