"use client";

import { AnimatePresence } from "motion/react";
import { ApplicationCard } from "@/components/dashboard/application-card";
import { cn } from "@/lib/utils";
import type { ApplicationListItemDTO } from "@/lib/api-types";

type MobileApplicationListHeading = {
  label: string;
  count: number;
  dotClassName: string;
};

type MobileApplicationListProps = {
  applications: ApplicationListItemDTO[];
  onSelectApplication: (application: ApplicationListItemDTO) => void;
  heading?: MobileApplicationListHeading;
};

export function MobileApplicationList({
  applications,
  onSelectApplication,
  heading,
}: MobileApplicationListProps) {
  return (
    <section aria-label={heading?.label} className="flex flex-col gap-2.5">
      {heading && (
        <h2 className="flex items-center gap-2 px-0.5 text-sm font-semibold text-foreground">
          <span className={cn("size-2 shrink-0 rounded-full", heading.dotClassName)} />
          {heading.label}
          <span className="text-xs font-normal text-muted-foreground">{heading.count}</span>
        </h2>
      )}
      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onSelect={onSelectApplication}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
