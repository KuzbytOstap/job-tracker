export type ProfileInputErrorCode = "CV_LIMIT" | "CV_TOO_LARGE" | "CV_NOT_PDF" | "EXAMPLE_LIMIT";

export class ProfileInputError extends Error {
  readonly code: ProfileInputErrorCode;

  constructor(code: ProfileInputErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ProfileInputError";
    this.code = code;
  }
}
