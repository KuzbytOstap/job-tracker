"use client";

import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { ReviewChip } from "@/components/applications/review-chip";
import { FitMismatchChip } from "@/components/applications/fit-mismatch-chip";
import { useI18n } from "@/components/i18n/i18n-provider";
import { getVisibleReviewReasons } from "@/lib/review-reasons";
import { TestTaskChip } from "@/components/applications/test-task-chip";
import { formatExactDateTime, formatRelativeDate } from "@/lib/relative-date";
import type { ApplicationListItemDTO } from "@/lib/api-types";

type ConsoleTableViewProps = {
  applications: ApplicationListItemDTO[];
  onSelectApplication: (application: ApplicationListItemDTO) => void;
};

export function ConsoleTableView({ applications, onSelectApplication }: ConsoleTableViewProps) {
  const { t, locale } = useI18n();

  return (
    <div className="px-4 pb-6 sm:px-6">
      <div
        role="region"
        aria-label={t("table.ariaLabel")}
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-[var(--gh-border)]"
      >
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-[var(--gh-surface-secondary)] text-xs tracking-wide text-[var(--gh-text-muted)] uppercase">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t("table.companyPosition")}
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t("table.status")}
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t("table.platform")}
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t("table.applied")}
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t("table.lastActivity")}
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t("table.signals")}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                {t("table.link")}
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
                  <PlatformBadge platform={application.platform} customPlatform={application.customPlatform} />
                </td>
                <td
                  className="px-3 py-2.5 text-xs text-[var(--gh-text-muted)]"
                  title={formatExactDateTime(application.appliedAt, { t, locale })}
                >
                  {formatRelativeDate(application.appliedAt, new Date(), t)}
                </td>
                <td
                  className="px-3 py-2.5 text-xs text-[var(--gh-text-muted)]"
                  title={formatExactDateTime(application.lastActivityAt, { t, locale })}
                >
                  {application.isAutoIgnored
                    ? t("table.autoIgnored")
                    : formatRelativeDate(application.lastActivityAt, new Date(), t)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {application.hasTestTask && <TestTaskChip done={application.testTaskDone} />}
                    <ReviewChip reasons={getVisibleReviewReasons(application)} />
                    <FitMismatchChip count={application.fitMismatchCount} />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {application.link && (
                    <a
                      href={application.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      aria-label={t("card.openPostingFor", { company: application.company })}
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
