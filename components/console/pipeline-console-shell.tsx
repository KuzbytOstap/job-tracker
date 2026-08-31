"use client";

import type { ReactNode } from "react";

type PipelineConsoleShellProps = {
  rail: ReactNode;
  children: ReactNode;
};

export function PipelineConsoleShell({ rail, children }: PipelineConsoleShellProps) {
  return (
    <div className="xl:flex xl:h-screen xl:overflow-hidden">
      <div className="hidden xl:flex xl:h-full xl:w-[232px] xl:shrink-0 xl:flex-col xl:overflow-y-auto xl:border-r xl:border-[var(--gh-border)] xl:bg-[var(--gh-surface-secondary)]">
        {rail}
      </div>

      <div className="xl:flex xl:min-w-0 xl:flex-1 xl:flex-col xl:h-full xl:overflow-hidden">
        {children}
      </div>
    </div>
  );
}
