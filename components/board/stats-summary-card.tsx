"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { StatSummaryCardConfig } from "@/lib/stats";

type StatsSummaryCardProps = {
  card: StatSummaryCardConfig;
};

export function StatsSummaryCard({ card }: StatsSummaryCardProps) {
  const content = (
    <>
      <p className="truncate text-xs text-muted-foreground">{card.label}</p>
      <motion.p
        key={card.value}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="font-heading text-xl font-semibold tabular-nums sm:text-2xl"
      >
        {card.value}
      </motion.p>
    </>
  );

  const className = cn(
    "flex min-w-0 min-h-11 flex-col justify-center gap-0.5 rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors",
    card.href &&
      "hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  );

  if (!card.href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link
      href={card.href}
      className={className}
      aria-label={`${card.label}: ${card.value} application${card.value === 1 ? "" : "s"}. View list.`}
    >
      {content}
    </Link>
  );
}
