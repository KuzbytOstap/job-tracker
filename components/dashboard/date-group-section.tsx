"use client";

import { AnimatePresence, motion } from "motion/react";
import { ApplicationCard } from "@/components/dashboard/application-card";
import { DraggableApplicationCard } from "@/components/board/draggable-application-card";
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
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-2.5"
    >
      <div className="flex items-baseline gap-2 px-0.5">
        <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
        <span className="text-xs text-muted-foreground">{group.count}</span>
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
