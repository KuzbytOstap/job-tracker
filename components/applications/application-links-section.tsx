"use client";

import { ExternalLink } from "lucide-react";
import { getUrlLabel } from "@/lib/url-labels";

type ApplicationLinksSectionProps = {
  urls: string[];
};

export function ApplicationLinksSection({ urls }: ApplicationLinksSectionProps) {
  if (urls.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Links
      </h3>
      <ul className="flex flex-col gap-2">
        {urls.map((url) => (
          <li key={url} className="min-w-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 text-sm text-primary underline-offset-2 hover:underline"
            >
              <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 break-all">
                {getUrlLabel(url)}
                <span className="block text-xs text-muted-foreground break-all">{url}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
