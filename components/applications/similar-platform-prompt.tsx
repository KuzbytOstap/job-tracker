"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/i18n-provider";
import { platformOptionLabel } from "@/lib/i18n/label-keys";
import type { PlatformOptionDTO } from "@/lib/api-types";

type SimilarPlatformPromptProps = {
  name: string;
  similar: PlatformOptionDTO;
  pending: boolean;
  onUseExisting: () => void;
  onCreateAnyway: () => void;
};

export function SimilarPlatformPrompt({
  name,
  similar,
  pending,
  onUseExisting,
  onCreateAnyway,
}: SimilarPlatformPromptProps) {
  const { t, rich } = useI18n();
  const existing = platformOptionLabel(t, similar);

  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--gh-border-strong,var(--border))] p-2.5 text-sm"
    >
      <span>
        {rich(
          "form.platform.similarExisting",
          { strong: (chunk) => <strong>{chunk}</strong> },
          { existing, name },
        )}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={onUseExisting}>
          {t("form.platform.useExisting", { name: existing })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-busy={pending}
          onClick={onCreateAnyway}
        >
          {t("form.platform.addAnyway", { name })}
        </Button>
      </div>
    </div>
  );
}
