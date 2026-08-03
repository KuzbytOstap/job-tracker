"use client";

import Link from "next/link";
import { useStatsQuery } from "@/hooks/use-stats";
import { buildStatSummaryCards } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function GameHubHero() {
  const statsQuery = useStatsQuery();
  const cards = statsQuery.data
    ? buildStatSummaryCards(statsQuery.data).filter((card) =>
        (["total", "interviews", "offers"] as const).includes(
          card.key as "total" | "interviews" | "offers",
        ),
      )
    : [];

  return (
    <section
      aria-label="Workspace overview"
      className="hidden border-b border-[var(--gh-border)] bg-[var(--gh-bg-secondary)] sm:block"
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 py-5 sm:px-6 sm:min-h-[130px]">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-[var(--gh-accent-secondary)] uppercase">
            Your pipeline
          </p>
          <h2 className="mt-1 font-heading text-xl font-semibold text-[var(--gh-text)] lg:text-2xl">
            Every application, one clear board
          </h2>
          <p className="mt-1 max-w-md text-sm text-[var(--gh-text-secondary)]">
            Track momentum across every stage without losing the thread.
          </p>
        </div>

        {cards.length > 0 && (
          <div className="flex shrink-0 items-stretch gap-2">
            {cards.map((card) => {
              const blockClassName = cn(
                "flex min-w-[84px] flex-col justify-center gap-0.5 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] px-3 py-2 shadow-[var(--gh-shadow)] transition-colors",
                card.href &&
                  "hover:border-[var(--gh-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              );

              const content = (
                <>
                  <p className="truncate text-[11px] text-[var(--gh-text-muted)]">{card.label}</p>
                  <p className="font-heading text-lg font-semibold tabular-nums text-[var(--gh-text)]">
                    {card.value}
                  </p>
                </>
              );

              if (!card.href) {
                return (
                  <div key={card.key} className={blockClassName}>
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={card.key}
                  href={card.href}
                  className={blockClassName}
                  aria-label={`${card.label}: ${card.value} application${card.value === 1 ? "" : "s"}. View list.`}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        )}

        <div aria-hidden className="relative hidden h-20 w-20 shrink-0 lg:block">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--gh-border-strong)]" />
          <div className="absolute inset-3 rounded-full border border-[var(--gh-accent-soft)]" />
          <div className="absolute inset-[26px] rounded-full bg-gradient-to-br from-[var(--gh-accent)] to-[var(--gh-accent-secondary)]" />
        </div>
      </div>
    </section>
  );
}
