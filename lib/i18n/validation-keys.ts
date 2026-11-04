import type { MessageKey } from "@/lib/i18n/messages";
import type { Translator } from "@/lib/i18n/translate";

const VALIDATION_MESSAGE_KEYS: Record<string, MessageKey> = {
  "Company is required": "validation.companyRequired",
  "Position is required": "validation.positionRequired",
  "Enter a valid http or https URL": "validation.invalidUrl",
  "Enter a valid date": "validation.invalidDate",
  "Enter a URL": "validation.enterUrl",
  "Job posting text is too long": "validation.jobPostingTooLong",
  "Cover letter text is too long": "validation.coverLetterTooLong",
  "HR call transcript is too long": "validation.hrTranscriptTooLong",
  "Enter a platform name": "validation.platformNameRequired",
  "Enter a valid platform name": "validation.platformNameInvalid",
  "Enter a valid email address": "profile.validation.invalidEmail",
  "Enter a whole number": "profile.validation.invalidNumber",
  "Use a 3 letter currency code": "profile.validation.invalidCurrency",
  "Choose the pay period": "profile.validation.periodRequired",
  "Text is too long": "profile.validation.tooLong",
};

const PLATFORM_NAME_TOO_LONG = /^Platform name must be at most (\d+) characters$/;

export function translateValidationMessage(t: Translator, message: string): string {
  const key = VALIDATION_MESSAGE_KEYS[message];
  if (key) return t(key);

  const tooLong = PLATFORM_NAME_TOO_LONG.exec(message);
  if (tooLong) return t("validation.platformNameTooLong", { max: Number(tooLong[1]) });

  return message;
}
