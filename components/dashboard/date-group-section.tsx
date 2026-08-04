"use client";

import { AnimatePresence, motion } from "motion/react";
import { ApplicationCard } from "@/components/dashboard/application-card";
import { DraggableApplicationCard } from "@/components/board/draggable-application-card";
import { cn } from "@/lib/utils";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { DateGroup } from "@/lib/date-grouping";

type DateGroupSectionProps = {
  group: DateGroup<ApplicationListItemDTO>;
  onSelectApplication: (application: ApplicationListItemDTO) => void;
  enableDrag?: boolean;
};

export function DateGroupSection({ group, onSelectApplication, enableDrag = false }: DateGroupSectionProps) {
  return (
    <motion.section
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1], layout: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
      className="flex flex-col gap-2.5"
    >
      <div className={cn("flex items-baseline gap-2 px-0.5", enableDrag && "kanban-date-group-heading")}>
        <h2 className={cn("text-sm font-semibold text-foreground", enableDrag && "kanban-date-group-label")}>
          {group.label}
        </h2>
        <span className={cn("text-xs text-muted-foreground", enableDrag && "kanban-date-group-count")}>
          {group.count}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {group.applications.map((application) =>
            enableDrag ? (
              <DraggableApplicationCard
                key={application.id}
                application={application}
                onSelect={onSelectApplication}
              />
            ) : (
              <ApplicationCard
                key={application.id}
                application={application}
                onSelect={onSelectApplication}
              />
            ),
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
