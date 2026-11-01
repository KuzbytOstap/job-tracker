"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CopyButton } from "@/components/ui/copy-button";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type SourceMaterialsSectionProps = {
  jobPostingText: string | null;
  coverLetterText: string | null;
};

export function SourceMaterialsSection({ jobPostingText, coverLetterText }: SourceMaterialsSectionProps) {
  const t = useT();

  if (!jobPostingText && !coverLetterText) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--gh-text-muted,var(--muted-foreground))] uppercase">
        {t("source.title")}
      </h3>
      <div className="flex flex-col gap-2">
        {jobPostingText && <SourceMaterialItem label={t("source.jobPosting")} copyLabel={t("source.copyJobPosting")} text={jobPostingText} />}
        {coverLetterText && <SourceMaterialItem label={t("source.coverLetter")} copyLabel={t("source.copyCoverLetter")} text={coverLetterText} />}
      </div>
    </div>
  );
}

function SourceMaterialItem({ label, copyLabel, text }: { label: string; copyLabel: string; text: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-[var(--gh-border,var(--border))] bg-[var(--gh-surface-secondary,var(--muted))]/60 p-3"
    >
      <div className="flex min-h-9 items-center justify-between gap-2">
        <CollapsibleTrigger className="flex min-h-9 flex-1 items-center justify-between gap-2 text-left text-sm font-medium text-[var(--gh-text,var(--foreground))]">
          {label}
          <span className="flex items-center gap-1 text-xs font-normal text-[var(--gh-text-muted,var(--muted-foreground))]">
            {open ? t("source.hide") : t("source.view")}
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </span>
        </CollapsibleTrigger>
        <CopyButton text={text} label={copyLabel} />
      </div>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none data-[ending-style]:h-0 data-[starting-style]:h-0">
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words text-[var(--gh-text,var(--foreground))]">
          {text}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
