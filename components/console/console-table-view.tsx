"use client";

import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { TestTaskChip } from "@/components/applications/test-task-chip";
import { formatExactDateTime, formatRelativeDate } from "@/lib/relative-date";
import type { ApplicationListItemDTO } from "@/lib/api-types";

type ConsoleTableViewProps = {
  applications: ApplicationListItemDTO[];
  onSelectApplication: (application: ApplicationListItemDTO) => void;
};

export function ConsoleTableView({ applications, onSelectApplication }: ConsoleTableViewProps) {
  return (
    <div className="px-4 pb-6 sm:px-6">
      <div
        role="region"
        aria-label="Applications table"
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-[var(--gh-border)]"
      >
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-[var(--gh-surface-secondary)] text-xs tracking-wide text-[var(--gh-text-muted)] uppercase">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Company / position
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Platform
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Applied
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Last activity
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Signals
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Link
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr
                key={application.id}
                tabIndex={0}
                onClick={() => onSelectApplication(application)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectApplication(application);
                  }
                }}
                className="cursor-pointer border-t border-[var(--gh-border)] transition-colors hover:bg-[var(--gh-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <td className="max-w-[220px] px-3 py-2.5">
                  <p className="truncate font-heading font-semibold text-[var(--gh-text)]">{application.company}</p>
                  <p className="truncate text-xs text-[var(--gh-text-muted)]">{application.position}</p>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={application.effectiveStatus} />
                </td>
                <td className="px-3 py-2.5">
                  <PlatformBadge platform={application.platform} />
                </td>
                <td
                  className="px-3 py-2.5 text-xs text-[var(--gh-text-muted)]"
                  title={formatExactDateTime(application.appliedAt)}
                >
                  {formatRelativeDate(application.appliedAt)}
                </td>
                <td
                  className="px-3 py-2.5 text-xs text-[var(--gh-text-muted)]"
                  title={formatExactDateTime(application.lastActivityAt)}
                >
                  {application.isAutoIgnored ? "Auto-ignored" : formatRelativeDate(application.lastActivityAt)}
                </td>
                <td className="px-3 py-2.5">
                  {application.hasTestTask && <TestTaskChip done={application.testTaskDone} />}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {application.link && (
                    <a
                      href={application.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Open ${application.company} job posting in a new tab`}
                      className="inline-flex items-center justify-center rounded-md p-1 text-[var(--gh-text-muted)] transition-colors hover:text-[var(--gh-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
