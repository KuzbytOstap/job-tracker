"use client";

import { format } from "date-fns";
import { useI18n } from "@/components/i18n/i18n-provider";
import { DATE_FNS_LOCALES } from "@/lib/i18n/date-locale";
import { STATUS_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { BOARD_COLUMNS_BY_STATUS } from "@/lib/board-columns";
import { cn } from "@/lib/utils";
import type { StatusChangeDTO } from "@/lib/api-types";

type StatusHistoryProps = {
  statusChanges: StatusChangeDTO[];
};

export function StatusHistory({ statusChanges }: StatusHistoryProps) {
  const { t, locale } = useI18n();

  if (statusChanges.length === 0) {
    return (
      <p className="text-sm text-[var(--gh-text-muted,var(--muted-foreground))]">{t("detail.history.empty")}</p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-3.5 pl-0.5">
      {statusChanges.map((change, index) => {
        const destination = BOARD_COLUMNS_BY_STATUS[change.toStatus];
        const isLast = index === statusChanges.length - 1;
        return (
          <li key={change.id} className="relative flex items-start gap-2.5">
            {!isLast && (
              <span
                aria-hidden
                className="absolute top-3 left-[3px] h-[calc(100%-0.25rem)] w-px bg-[var(--gh-border,var(--border))]"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "z-10 mt-1.5 size-2 shrink-0 rounded-full ring-2 ring-[var(--gh-surface,var(--popover))]",
                destination.dotClassName,
              )}
            />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="text-[var(--gh-text-muted,var(--muted-foreground))]">
                  {t(STATUS_LABEL_KEYS[change.fromStatus])}
                </span>
                <span className="mx-1.5 text-[var(--gh-text-muted,var(--muted-foreground))]/60">→</span>
                <span className="font-medium text-[var(--gh-text,var(--foreground))]">
                  {t(STATUS_LABEL_KEYS[change.toStatus])}
                </span>
              </p>
              <p className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">
                {format(new Date(change.changedAt), "d MMM yyyy, HH:mm", { locale: DATE_FNS_LOCALES[locale] })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
