"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronsLeft, ChevronsRight, History, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicationListItemDTO } from "@/lib/api-types";

type StatusValue = ApplicationListItemDTO["status"];
type FocusSection = "pipeline" | "interviews" | "activity";

type FocusDockProps = {
  applications: ApplicationListItemDTO[];
  isLoading: boolean;
  detailOpen: boolean;
  onSelectApplication: (id: string) => void;
  className?: string;
};

const PIPELINE_STATUSES = [
  "APPLIED",
  "HR_REPLIED",
  "HR_CALL",
  "TECH_INTERVIEW",
  "TEST_TASK",
  "OFFER",
] as const satisfies readonly StatusValue[];

const PROMINENT_STATUSES = new Set<StatusValue>(["TECH_INTERVIEW", "TEST_TASK", "OFFER"]);

const INTERVIEW_STAGE_RANK: Partial<Record<StatusValue, number>> = {
  HR_CALL: 0,
  TECH_INTERVIEW: 1,
  TEST_TASK: 2,
};

const STATUS_LABELS: Record<StatusValue, string> = {
  APPLIED: "Applied",
  HR_REPLIED: "HR Replied",
  HR_CALL: "HR Call",
  TECH_INTERVIEW: "Technical Interview",
  TEST_TASK: "Test Task",
  OFFER: "Offer",
  REJECTED: "Rejected",
  IGNORED: "Ignored",
};

const STATUS_DOT_VARS: Record<StatusValue, string> = {
  APPLIED: "var(--gh-status-applied)",
  HR_REPLIED: "var(--gh-status-hr-replied)",
  HR_CALL: "var(--gh-status-hr-call)",
  TECH_INTERVIEW: "var(--gh-status-tech-interview)",
  TEST_TASK: "var(--gh-status-test-task)",
  OFFER: "var(--gh-status-offer)",
  REJECTED: "var(--gh-status-rejected)",
  IGNORED: "var(--gh-status-ignored)",
};

function formatDockDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function FocusDock({ applications, isLoading, detailOpen, onSelectApplication, className }: FocusDockProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<FocusSection>("pipeline");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (detailOpen) setExpanded(false);
  }, [detailOpen]);

  useEffect(() => {
    if (!expanded) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded]);

  const pipelineCounts = useMemo(() => {
    const counts = new Map<StatusValue, number>(
      PIPELINE_STATUSES.map((status): [StatusValue, number] => [status, 0]),
    );
    for (const application of applications) {
      if (counts.has(application.effectiveStatus)) {
        counts.set(application.effectiveStatus, (counts.get(application.effectiveStatus) ?? 0) + 1);
      }
    }
    return counts;
  }, [applications]);

  const activePipelineTotal = useMemo(() => {
    let total = 0;
    for (const count of pipelineCounts.values()) total += count;
    return total;
  }, [pipelineCounts]);

  const interviewStageApplications = useMemo(() => {
    return applications
      .map((application, index) => ({ application, index }))
      .filter(({ application }) => application.effectiveStatus in INTERVIEW_STAGE_RANK)
      .sort((a, b) => {
        const rankA = INTERVIEW_STAGE_RANK[a.application.effectiveStatus] ?? 0;
        const rankB = INTERVIEW_STAGE_RANK[b.application.effectiveStatus] ?? 0;
        if (rankA !== rankB) return rankB - rankA;
        return a.index - b.index;
      })
      .map(({ application }) => application);
  }, [applications]);

  const interviewStageTotal = interviewStageApplications.length;
  const interviewStagePreview = interviewStageApplications.slice(0, 4);

  const recentActivity = useMemo(() => {
    return [...applications]
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
      .slice(0, 3);
  }, [applications]);

  function openSection(section: FocusSection) {
    if (expanded && activeSection === section) {
      setExpanded(false);
      return;
    }
    setActiveSection(section);
    setExpanded(true);
  }

  const panelWidth = 320;
  const transition = { duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div
      ref={rootRef}
      className={cn(
        "hidden shrink-0 self-start transition-opacity duration-200 ease-out lg:sticky lg:top-4 lg:flex lg:items-start",
        detailOpen ? "pointer-events-none opacity-0" : "opacity-100",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="focus-dock-panel"
            id={panelId}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={transition}
            className="focus-dock-panel mr-2 shrink-0 overflow-hidden rounded-lg"
          >
            <div style={{ width: panelWidth }} className="flex max-h-[calc(100vh-4rem)] flex-col overflow-y-auto p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gh-text-muted)]">
                  Focus
                </span>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-md p-1 text-[var(--gh-text-secondary)] hover:bg-[var(--gh-dock-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gh-accent)]"
                  aria-label="Collapse focus panel"
                >
                  <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <PipelineSection isLoading={isLoading} pipelineCounts={pipelineCounts} />
              <InterviewSection
                isLoading={isLoading}
                applications={interviewStagePreview}
                onSelectApplication={onSelectApplication}
              />
              <ActivitySection
                isLoading={isLoading}
                applications={recentActivity}
                onSelectApplication={onSelectApplication}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="focus-dock-rail flex w-14 flex-col items-center gap-1.5 rounded-md py-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={expanded ? "Collapse focus dock" : "Expand focus dock"}
          title={expanded ? "Collapse focus dock" : "Expand focus dock"}
          className="focus-dock-icon flex h-9 w-9 items-center justify-center rounded-md text-[var(--gh-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gh-accent)]"
        >
          {expanded ? (
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <div className="my-1 h-px w-8 bg-[var(--gh-dock-border)]" aria-hidden="true" />

        <DockIconButton
          icon={<Target className="h-4 w-4" aria-hidden="true" />}
          label="Pipeline focus"
          active={expanded && activeSection === "pipeline"}
          count={isLoading ? undefined : activePipelineTotal}
          onClick={() => openSection("pipeline")}
          panelId={panelId}
        />
        <DockIconButton
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          label="Interview stages"
          active={expanded && activeSection === "interviews"}
          count={isLoading ? undefined : interviewStageTotal}
          onClick={() => openSection("interviews")}
          panelId={panelId}
        />
        <DockIconButton
          icon={<History className="h-4 w-4" aria-hidden="true" />}
          label="Recent activity"
          active={expanded && activeSection === "activity"}
          onClick={() => openSection("activity")}
          panelId={panelId}
        />
      </div>
    </div>
  );
}

function DockIconButton({
  icon,
  label,
  active,
  count,
  onClick,
  panelId,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
  panelId: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-controls={panelId}
      aria-label={label}
      title={label}
      data-active={active ? "true" : undefined}
      whileHover={shouldReduceMotion ? undefined : { x: -1 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      className="focus-dock-icon relative flex h-9 w-9 items-center justify-center rounded-md text-[var(--gh-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gh-accent)]"
    >
      {icon}
      {typeof count === "number" && count > 0 && (
        <span className="focus-dock-badge absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </motion.button>
  );
}

function PipelineSection({
  isLoading,
  pipelineCounts,
}: {
  isLoading: boolean;
  pipelineCounts: Map<StatusValue, number>;
}) {
  return (
    <section className="mb-3">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--gh-text-muted)]">
        Pipeline focus
      </h3>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-4 w-full animate-pulse rounded bg-[var(--gh-surface-subtle)]" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1">
          {PIPELINE_STATUSES.map((status) => {
            const count = pipelineCounts.get(status) ?? 0;
            const prominent = PROMINENT_STATUSES.has(status);
            return (
              <li key={status} className="flex items-center justify-between text-xs">
                <span className={prominent ? "font-semibold text-[var(--gh-text)]" : "text-[var(--gh-text-secondary)]"}>
                  {STATUS_LABELS[status]}
                </span>
                <span
                  className={
                    prominent
                      ? "font-semibold text-[var(--gh-accent-secondary)]"
                      : "text-[var(--gh-text-muted)]"
                  }
                >
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function InterviewSection({
  isLoading,
  applications,
  onSelectApplication,
}: {
  isLoading: boolean;
  applications: ApplicationListItemDTO[];
  onSelectApplication: (id: string) => void;
}) {
  return (
    <section className="mb-3 border-t border-[var(--gh-dock-border)] pt-2.5">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--gh-text-muted)]">
        Interview stages
      </h3>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-8 w-full animate-pulse rounded bg-[var(--gh-surface-subtle)]" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <p className="text-xs text-[var(--gh-text-muted)]">No applications in interview stages.</p>
      ) : (
        <ul className="space-y-0.5">
          {applications.map((application) => (
            <li key={application.id}>
              <button
                type="button"
                onClick={() => onSelectApplication(application.id)}
                className="focus-dock-row flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gh-accent)]"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: STATUS_DOT_VARS[application.effectiveStatus] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-[var(--gh-text)]">
                    {application.company}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--gh-text-muted)]">
                    {application.position} · {STATUS_LABELS[application.effectiveStatus]}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-[var(--gh-text-muted)]">
                  {formatDockDate(application.lastActivityAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivitySection({
  isLoading,
  applications,
  onSelectApplication,
}: {
  isLoading: boolean;
  applications: ApplicationListItemDTO[];
  onSelectApplication: (id: string) => void;
}) {
  return (
    <section className="border-t border-[var(--gh-dock-border)] pt-2.5">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--gh-text-muted)]">
        Recent activity
      </h3>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-8 w-full animate-pulse rounded bg-[var(--gh-surface-subtle)]" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <p className="text-xs text-[var(--gh-text-muted)]">No recent activity.</p>
      ) : (
        <ul className="space-y-0.5">
          {applications.map((application) => (
            <li key={application.id}>
              <button
                type="button"
                onClick={() => onSelectApplication(application.id)}
                className="focus-dock-row flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gh-accent)]"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: STATUS_DOT_VARS[application.effectiveStatus] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-[var(--gh-text)]">
                    {application.company}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--gh-text-muted)]">
                    {STATUS_LABELS[application.effectiveStatus]}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-[var(--gh-text-muted)]">
                  {formatDockDate(application.lastActivityAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
