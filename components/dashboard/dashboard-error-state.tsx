"use client";

import { AlertTriangle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardErrorStateProps = {
  onRetry: () => void;
  visualVariant?: "default" | "gameHub";
};

export function DashboardErrorState({ onRetry, visualVariant = "default" }: DashboardErrorStateProps) {
  const isGameHub = visualVariant === "gameHub";
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      role="alert"
      initial={isGameHub && !reducedMotion ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 py-16 text-center",
        isGameHub && "gh-list-error-state",
      )}
    >
      {isGameHub ? (
        <span className="gh-list-error-icon" aria-hidden>
          <AlertTriangle className="size-5" />
        </span>
      ) : (
        <AlertTriangle className="size-8 text-destructive/70" />
      )}
      <div className="space-y-1 px-6">
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load your applications. Please try again.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </motion.div>
  );
}
