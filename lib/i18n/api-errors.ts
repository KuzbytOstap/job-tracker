import { ApiError } from "@/lib/api";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Translator } from "@/lib/i18n/translate";

const CODE_KEYS: Record<string, MessageKey> = {
  AI_ACCESS_REQUIRED: "errors.codes.aiAccessRequired",
  AI_SUSPENDED: "errors.codes.aiSuspended",
  VACANCY_LIMIT_REACHED: "errors.codes.vacancyLimit",
  HR_LIMIT_REACHED: "errors.codes.hrLimit",
  PROFILE_LIMIT_REACHED: "errors.codes.profileLimit",
  COVER_LETTER_LIMIT_REACHED: "errors.codes.coverLetterLimit",
  CV_NOT_PDF: "errors.codes.cvNotPdf",
  CV_TOO_LARGE: "errors.codes.cvTooLarge",
  CV_LIMIT: "errors.codes.cvLimit",
  EXAMPLE_LIMIT: "errors.codes.exampleLimit",
  TOKEN_LIMIT_REACHED: "errors.codes.tokenLimit",
  LIMIT_REACHED: "errors.codes.platformLimit",
};

const STATUS_KEYS: Record<number, MessageKey> = {
  401: "errors.unauthorized",
  403: "errors.forbidden",
  404: "errors.notFound",
  409: "errors.conflict",
  429: "errors.rateLimited",
  502: "errors.unavailable",
  503: "errors.unavailable",
  504: "errors.unavailable",
};

function readCode(details: unknown): string | null {
  if (typeof details !== "object" || details === null) return null;
  const code = (details as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function getApiErrorMessage(t: Translator, error: unknown, fallback: MessageKey): string {
  if (!(error instanceof ApiError)) return t(fallback);

  const code = readCode(error.details);
  const codeKey = code ? CODE_KEYS[code] : undefined;
  if (codeKey) return t(codeKey);

  const statusKey = STATUS_KEYS[error.status];
  return statusKey ? t(statusKey) : t(fallback);
}
