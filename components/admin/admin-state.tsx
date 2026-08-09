"use client";

import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AdminEmptyStateProps = {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  className?: string;
};

export function AdminEmptyState({ icon: Icon = Inbox, title, description, className }: AdminEmptyStateProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "gh-list-quiet-state flex flex-col items-center gap-2.5 rounded-xl border border-dashed py-10 text-center",
        className,
      )}
    >
      <span className="gh-list-quiet-icon" aria-hidden>
        <Icon className="size-5" />
      </span>
      <div className="max-w-sm space-y-1 px-6">
        <p className="text-sm font-medium text-[var(--gh-text)]">{title}</p>
        {description && <p className="text-sm text-[var(--gh-text-muted)]">{description}</p>}
      </div>
    </motion.div>
  );
}

type AdminErrorStateProps = {
  message?: string;
  onRetry: () => void;
  className?: string;
};

export function AdminErrorState({
  message = "We couldn't load this. Please try again.",
  onRetry,
  className,
}: AdminErrorStateProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      role="alert"
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "gh-list-error-state flex flex-col items-center gap-2.5 rounded-xl border py-10 text-center",
        className,
      )}
    >
      <span className="gh-list-error-icon" aria-hidden>
        <AlertTriangle className="size-5" />
      </span>
      <div className="max-w-sm space-y-1 px-6">
        <p className="text-sm font-medium text-[var(--gh-text)]">Something went wrong</p>
        <p className="text-sm text-[var(--gh-text-muted)]">{message}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </motion.div>
  );
}

type AdminSkeletonListProps = {
  rows?: number;
  className?: string;
  rowClassName?: string;
};

export function AdminSkeletonList({ rows = 3, className, rowClassName }: AdminSkeletonListProps) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "gh-list-skeleton-card flex items-center gap-3 rounded-xl border border-l-[3px] px-4 py-3",
            rowClassName,
          )}
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function AdminSectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("gh-section-heading text-xs font-semibold tracking-wide uppercase", className)}>
      {children}
    </h2>
  );
}
