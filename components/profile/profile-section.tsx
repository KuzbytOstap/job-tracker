"use client";

import { useId, type ReactNode } from "react";

type ProfileSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function ProfileSection({ title, description, children }: ProfileSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="gh-form-surface flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 id={headingId} className="font-heading text-base font-semibold tracking-tight text-[var(--gh-text)]">
          {title}
        </h2>
        {description ? <p className="text-sm text-[var(--gh-text-muted)]">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
