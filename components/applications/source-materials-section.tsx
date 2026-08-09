"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

type SourceMaterialsSectionProps = {
  jobPostingText: string | null;
  coverLetterText: string | null;
};

export function SourceMaterialsSection({ jobPostingText, coverLetterText }: SourceMaterialsSectionProps) {
  if (!jobPostingText && !coverLetterText) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--gh-text-muted,var(--muted-foreground))] uppercase">
        Source materials
      </h3>
      <div className="flex flex-col gap-2">
        {jobPostingText && <SourceMaterialItem label="Job posting" text={jobPostingText} />}
        {coverLetterText && <SourceMaterialItem label="Cover letter" text={coverLetterText} />}
      </div>
    </div>
  );
}

function SourceMaterialItem({ label, text }: { label: string; text: string }) {
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
            {open ? "Hide" : "View"}
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </span>
        </CollapsibleTrigger>
        <CopyButton text={text} label={`Copy ${label.toLowerCase()}`} />
      </div>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none data-[ending-style]:h-0 data-[starting-style]:h-0">
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words text-[var(--gh-text,var(--foreground))]">
          {text}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
