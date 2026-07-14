"use client";

import { AnimatePresence, motion } from "motion/react";
import { ApplicationCard } from "@/components/dashboard/application-card";
import type { ApplicationDTO } from "@/lib/api-types";
import type { DateGroup } from "@/lib/date-grouping";

type DateGroupSectionProps = {
  group: DateGroup<ApplicationDTO>;
  onSelectApplication: (application: ApplicationDTO) => void;
};

export function DateGroupSection({ group, onSelectApplication }: DateGroupSectionProps) {
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
          {group.applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onSelect={onSelectApplication}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
