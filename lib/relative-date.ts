import type { Locale } from "@/lib/i18n/locales";
import { defaultTranslator, type Translator } from "@/lib/i18n/translate";

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatRelativeDate(
  value: string | Date,
  now: Date = new Date(),
  t: Translator = defaultTranslator,
): string {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return t("time.unknownDate");
  }

  const dayDiff = Math.round(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / 86_400_000,
  );

  if (dayDiff <= 0) return t("time.today");
  if (dayDiff === 1) return t("time.yesterday");
  if (dayDiff < 7) return t("time.daysAgo", { count: dayDiff });

  if (dayDiff < 30) {
    return t("time.weeksAgo", { count: Math.floor(dayDiff / 7) });
  }

  return t("time.monthsAgo", { count: Math.max(1, Math.floor(dayDiff / 30)) });
}

type ExactDateTimeOptions = {
  t?: Translator;
  locale?: Locale;
};

export function formatExactDateTime(
  value: string | Date,
  { t = defaultTranslator, locale }: ExactDateTimeOptions = {},
): string {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return t("time.unknownDateCapitalized");
  }

  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
