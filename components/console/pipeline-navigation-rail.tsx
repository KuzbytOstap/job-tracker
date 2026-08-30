"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, type LucideIcon } from "lucide-react";
import { BOARD_COLUMNS, getStatusPageHref } from "@/lib/board-columns";
import { useStatsQuery } from "@/hooks/use-stats";
import { cn } from "@/lib/utils";

const PIPELINE_NAV_COLUMNS = BOARD_COLUMNS.slice(0, 6);
const CLOSED_NAV_COLUMNS = BOARD_COLUMNS.slice(6);

type PipelineNavigationRailProps = {
  isAdmin: boolean;
};

export function PipelineNavigationRail({ isAdmin }: PipelineNavigationRailProps) {
  const pathname = usePathname();
  const statsQuery = useStatsQuery();
  const total = statsQuery.data?.total;
  const counts = statsQuery.data?.counts;
  const isAllApplications = pathname === "/";

  return (
    <nav aria-label="Pipeline navigation" className="flex h-full flex-col gap-4 px-3 py-4">
      <div className="flex items-center gap-2 px-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--gh-action-primary-bg)] text-xs font-bold text-[var(--gh-action-primary-fg)]">
          JT
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold tracking-tight text-[var(--gh-text)]">
            Job Tracker
          </p>
          <p className="truncate font-mono text-xs text-[var(--gh-text-muted)] tabular-nums">
            {typeof total === "number" ? `${total} application${total === 1 ? "" : "s"}` : "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <RailLink href="/" label="All applications" active={isAllApplications} count={total} />
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-2 pb-1 text-[10px] font-medium tracking-[0.08em] text-[var(--gh-text-muted)] uppercase">
          Pipeline
        </p>
        {PIPELINE_NAV_COLUMNS.map((column) => {
          const href = getStatusPageHref(column.status);
          return (
            <RailLink
              key={column.status}
              href={href}
              label={column.label}
              active={pathname === href}
              count={counts?.[column.status]}
              dotClassName={column.dotClassName}
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-2 pb-1 text-[10px] font-medium tracking-[0.08em] text-[var(--gh-text-muted)] uppercase">
          Closed
        </p>
        {CLOSED_NAV_COLUMNS.map((column) => {
          const href = getStatusPageHref(column.status);
          return (
            <RailLink
              key={column.status}
              href={href}
              label={column.label}
              active={pathname === href}
              count={counts?.[column.status]}
              dotClassName={column.dotClassName}
            />
          );
        })}
      </div>

      {isAdmin && (
        <div className="mt-auto flex flex-col gap-0.5 border-t border-[var(--gh-border)] pt-3">
          <RailLink href="/admin" label="Admin" icon={ShieldCheck} />
        </div>
      )}
    </nav>
  );
}

type RailLinkProps = {
  href: string;
  label: string;
  active?: boolean;
  count?: number;
  icon?: LucideIcon;
  dotClassName?: string;
};

function RailLink({ href, label, active = false, count, icon: Icon, dotClassName }: RailLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-[var(--gh-surface)] text-[var(--gh-text)] shadow-[var(--gh-shadow)]"
          : "text-[var(--gh-text-secondary)] hover:bg-[var(--gh-accent-soft)] hover:text-[var(--gh-text)]",
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {dotClassName && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dotClassName)} />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof count === "number" && (
        <span className="shrink-0 font-mono text-xs text-[var(--gh-text-muted)] tabular-nums">{count}</span>
      )}
    </Link>
  );
}
