"use client";

import { ExternalLink } from "lucide-react";
import { getUrlLabel } from "@/lib/url-labels";
import { CopyButton } from "@/components/ui/copy-button";

type ApplicationLinksSectionProps = {
  urls: string[];
};

export function ApplicationLinksSection({ urls }: ApplicationLinksSectionProps) {
  if (urls.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--gh-text-muted,var(--muted-foreground))] uppercase">
        Links
      </h3>
      <ul className="flex flex-col gap-1.5">
        {urls.map((url) => (
          <li
            key={url}
            className="flex min-w-0 items-start gap-1 rounded-lg border border-[var(--gh-border,var(--border))] bg-[var(--gh-surface-secondary,var(--muted))]/50 px-2.5 py-2"
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 flex-1 items-start gap-1.5 text-sm underline-offset-2 hover:underline"
            >
              <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-[var(--gh-accent,var(--primary))]" />
              <span className="min-w-0 break-all">
                <span className="font-medium text-[var(--gh-text,var(--foreground))]">{getUrlLabel(url)}</span>
                <span className="block text-xs break-all text-[var(--gh-text-muted,var(--muted-foreground))]">
                  {url}
                </span>
              </span>
            </a>
            <CopyButton text={url} label="Copy link" className="mt-0.5 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
