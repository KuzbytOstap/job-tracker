"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/i18n-provider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div role="group" aria-label={t("settings.language.title")} className="flex gap-2">
      {LOCALES.map((candidate) => (
        <Button
          key={candidate}
          type="button"
          size="sm"
          variant={candidate === locale ? "default" : "outline"}
          aria-pressed={candidate === locale}
          lang={candidate}
          className="h-10 flex-1 sm:h-8"
          onClick={() => setLocale(candidate)}
        >
          {LOCALE_LABELS[candidate]}
        </Button>
      ))}
    </div>
  );
}
