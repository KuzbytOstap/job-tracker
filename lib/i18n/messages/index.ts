import type { Locale } from "@/lib/i18n/locales";
import { en } from "./en";
import { uk } from "./uk";
import type { Messages } from "./types";

export type { MessageKey, Messages, PluralMessage } from "./types";

export const messages: Record<Locale, Messages> = { en, uk };
