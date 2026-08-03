"use client";

import { useEffect, useState } from "react";
import { DragOverlay, defaultDropAnimation } from "@dnd-kit/core";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { ApplicationListItemDTO } from "@/lib/api-types";

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);
    const listener = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return prefersReducedMotion;
}

type ApplicationDragOverlayProps = {
  application: ApplicationListItemDTO | null;
};

export function ApplicationDragOverlay({ application }: ApplicationDragOverlayProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <DragOverlay dropAnimation={prefersReducedMotion ? null : defaultDropAnimation}>
      {application ? (
        <div className="kanban-drag-overlay w-[260px] scale-[1.02] rounded-xl border border-border bg-card p-3 shadow-lg shadow-black/10 motion-reduce:scale-100 dark:shadow-black/40">
          <p className="truncate font-heading text-sm font-semibold text-foreground">
            {application.company}
          </p>
          <p className="truncate text-xs text-muted-foreground">{application.position}</p>
          <div className="mt-2">
            <StatusBadge status={application.effectiveStatus} />
          </div>
        </div>
      ) : null}
    </DragOverlay>
  );
}
