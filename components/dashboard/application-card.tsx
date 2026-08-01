"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { TestTaskChip } from "@/components/applications/test-task-chip";
import { cn } from "@/lib/utils";
import { formatExactDateTime, formatRelativeDate } from "@/lib/relative-date";
import type { ApplicationListItemDTO } from "@/lib/api-types";

type ApplicationCardProps = {
  application: ApplicationListItemDTO;
  onSelect: (application: ApplicationListItemDTO) => void;
  dragHandle?: ReactNode;
};

export function ApplicationCard({ application, onSelect, dragHandle }: ApplicationCardProps) {
  const isIgnored = application.effectiveStatus === "IGNORED";

  return (
    <motion.div
      layoutId={application.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onSelect(application)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(application);
          }
        }}
        className={cn(
          "cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isIgnored && "opacity-60",
        )}
      >
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            {dragHandle}
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base leading-tight font-semibold">
                {application.company}
              </p>
              <p className="truncate text-sm text-muted-foreground">{application.position}</p>
            </div>
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <PlatformBadge platform={application.platform} />
            <StatusBadge status={application.effectiveStatus} />
            {application.hasTestTask && <TestTaskChip done={application.testTaskDone} />}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span title={formatExactDateTime(application.appliedAt)}>
              Applied {formatRelativeDate(application.appliedAt)}
            </span>
            <span title={formatExactDateTime(application.lastActivityAt)}>
              Last activity {formatRelativeDate(application.lastActivityAt)}
            </span>
          </div>

          {application.isAutoIgnored && (
            <p className="text-xs text-muted-foreground italic">
              Auto-ignored after 21 days of silence
            </p>
          )}

          {(application.salaryExpectation || application.link) && (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="truncate text-xs text-muted-foreground/80">
                {application.salaryExpectation ?? ""}
              </span>
              {application.link && (
                <a
                  href={application.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Open job posting in a new tab"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
