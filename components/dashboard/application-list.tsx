"use client";

import { AnimatePresence } from "motion/react";
import { DateGroupSection } from "@/components/dashboard/date-group-section";
import { groupApplicationsByAppliedDate } from "@/lib/date-grouping";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";

type ApplicationListProps = {
  applications: ApplicationListItemDTO[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationListItemDTO) => void;
};

export function ApplicationList({ applications, sort, onSelectApplication }: ApplicationListProps) {
  const groups = groupApplicationsByAppliedDate(applications, sort);

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence initial={false}>
        {groups.map((group) => (
          <DateGroupSection
            key={group.key}
            group={group}
            onSelectApplication={onSelectApplication}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
