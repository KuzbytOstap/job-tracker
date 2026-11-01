"use client";

import { Inbox, SearchX } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";

export type DashboardEmptyVariant = "all" | "filtered" | "search";

type DashboardEmptyStateProps = {
  variant: DashboardEmptyVariant;
  searchQuery?: string;
  onAddClick?: () => void;
  visualVariant?: "default" | "gameHub";
};

export function DashboardEmptyState({
  variant,
  searchQuery,
  onAddClick,
  visualVariant = "default",
}: DashboardEmptyStateProps) {
  const t = useT();
  const isGameHub = visualVariant === "gameHub";
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={isGameHub && !reducedMotion ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center",
        isGameHub && "gh-list-quiet-state",
      )}
    >
      {isGameHub ? (
        <span className="gh-list-quiet-icon" aria-hidden>
          {variant === "search" ? <SearchX className="size-5" /> : <Inbox className="size-5" />}
        </span>
      ) : variant === "search" ? (
        <SearchX className="size-8 text-muted-foreground/60" />
      ) : (
        <Inbox className="size-8 text-muted-foreground/60" />
      )}
      <div className="max-w-sm space-y-1 px-6">
        <p className="text-sm font-medium break-words">
          {variant === "all" && t("dashboard.emptyState.allTitle")}
          {variant === "filtered" && t("dashboard.emptyState.filteredTitle")}
          {variant === "search" && t("dashboard.emptyState.searchTitle", { query: searchQuery ?? "" })}
        </p>
        <p className="text-sm text-muted-foreground">
          {variant === "all" && t("dashboard.emptyState.allDescription")}
          {variant === "filtered" && t("dashboard.emptyState.filteredDescription")}
          {variant === "search" && t("dashboard.emptyState.searchDescription")}
        </p>
      </div>
      {variant === "all" && onAddClick && (
        <Button onClick={onAddClick} className="mt-1">
          {t("dashboard.emptyState.addFirst")}
        </Button>
      )}
    </motion.div>
  );
}
