"use client";

import { Button } from "@/components/ui/button";
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
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--gh-border-strong,var(--border))] p-2.5 text-sm"
    >
      <span>
        <strong>{similar.label}</strong> already exists and looks similar to <strong>{name}</strong>.
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={onUseExisting}>
          Use {similar.label}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-busy={pending}
          onClick={onCreateAnyway}
        >
          Add {name} anyway
        </Button>
      </div>
    </div>
  );
}
