import type { Locale as DateFnsLocale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { uk } from "date-fns/locale/uk";
import type { Locale } from "@/lib/i18n/locales";

export const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { en: enUS, uk };
