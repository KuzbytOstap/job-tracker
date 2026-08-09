"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { TestTaskChip } from "@/components/applications/test-task-chip";
import { StatusPipeline } from "@/components/applications/status-pipeline";
import { TestTaskBranch } from "@/components/applications/test-task-branch";
import { TerminalStatusActions } from "@/components/applications/terminal-status-actions";
import { TestTaskControls } from "@/components/applications/test-task-controls";
import { StatusHistory } from "@/components/applications/status-history";
import { SourceMaterialsSection } from "@/components/applications/source-materials-section";
import { ApplicationLinksSection } from "@/components/applications/application-links-section";
import { HrInterviewQuestionsSection } from "@/components/applications/hr-interview-questions-section";
import { CopyButton } from "@/components/ui/copy-button";
import { formatExactDateTime, formatRelativeDate } from "@/lib/relative-date";
import { DeleteApplicationDialog } from "@/components/applications/delete-application-dialog";
import { useReactivateApplication } from "@/hooks/use-reactivate-application";
import { useAiAccessStatus } from "@/hooks/use-ai-access-status";
import { useAiUsageStatus } from "@/hooks/use-ai-usage-status";
import { STATUS_LABELS } from "@/lib/labels";
import { AUTO_IGNORE_AFTER_DAYS } from "@/lib/status";
import { AiAccessStatus } from "@/app/generated/prisma/enums";
import type { ApplicationDTO } from "@/lib/api-types";
import type { ReactNode } from "react";

type ApplicationDetailViewProps = {
  application: ApplicationDTO;
  onEdit: () => void;
  onDeleted: () => void;
};

function DetailRow({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <dt className="text-[0.7rem] font-medium tracking-wide text-[var(--gh-text-muted,var(--muted-foreground))] uppercase">
          {label}
        </dt>
        {action}
      </div>
      <dd className="text-sm break-words text-[var(--gh-text,var(--foreground))]">{children}</dd>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--gh-text-muted,var(--muted-foreground))] uppercase">
      {children}
    </h3>
  );
}

function SectionSurface({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--gh-border,var(--border))] bg-[var(--gh-surface-secondary,var(--muted))] p-3">
      {children}
    </div>
  );
}

function companyMonogram(company: string) {
  const trimmed = company.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || trimmed[0]?.toUpperCase() || "?";
}

export function ApplicationDetailView({ application, onEdit, onDeleted }: ApplicationDetailViewProps) {
  const reactivateMutation = useReactivateApplication();
  const aiAccess = useAiAccessStatus();
  const aiUsage = useAiUsageStatus(aiAccess.data?.status === AiAccessStatus.APPROVED);

  function handleReactivate() {
    reactivateMutation.mutate(application.id, {
      onSuccess: () => toast.success(`${application.company} marked as active`),
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-start justify-between gap-3 border-b border-[var(--gh-border,var(--border))] bg-[var(--gh-surface,var(--popover))]/95 px-4 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--gh-border,var(--border))] bg-[var(--gh-surface-subtle,var(--muted))] text-xs font-bold tracking-wide text-[var(--gh-text-secondary,var(--muted-foreground))]"
          >
            {companyMonogram(application.company)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-semibold leading-tight text-[var(--gh-text,var(--foreground))]">
              {application.company}
            </h2>
            <p className="truncate text-sm text-[var(--gh-text-secondary,var(--muted-foreground))]">
              {application.position}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <PlatformBadge platform={application.platform} />
              <StatusBadge status={application.effectiveStatus} />
              {application.hasTestTask && <TestTaskChip done={application.testTaskDone} />}
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
      </div>

      {application.isAutoIgnored && (
        <div className="rounded-lg border border-dashed border-[var(--gh-border-strong,var(--border))] bg-[var(--gh-surface-subtle,var(--muted))] p-3">
          <p className="text-sm text-[var(--gh-text,var(--foreground))]">
            Shown under <strong>Ignored</strong> because more than {AUTO_IGNORE_AFTER_DAYS} days passed
            without activity. Its stored status wasn&apos;t changed, and no status-change record was
            created for this.
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <DetailRow label="Effective status">{STATUS_LABELS[application.effectiveStatus]}</DetailRow>
            <DetailRow label="Stored status">{STATUS_LABELS[application.status]}</DetailRow>
          </dl>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={reactivateMutation.isPending}
            aria-busy={reactivateMutation.isPending}
            onClick={handleReactivate}
          >
            {reactivateMutation.isPending ? "Marking active…" : "Mark as active"}
          </Button>
        </div>
      )}

      <div>
        <SectionLabel>Pipeline</SectionLabel>
        <StatusPipeline application={application} />
      </div>

      <TestTaskBranch application={application} />

      <div>
        <SectionLabel>Terminal actions</SectionLabel>
        <TerminalStatusActions application={application} />
      </div>

      <div>
        <SectionLabel>Test task</SectionLabel>
        <TestTaskControls application={application} />
      </div>

      <div>
        <SectionLabel>Details</SectionLabel>
        <SectionSurface>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {application.link && (
              <DetailRow label="Vacancy link">
                <span className="inline-flex items-center gap-1">
                  <a
                    href={application.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                  >
                    Open link
                    <ExternalLink className="size-3.5" />
                  </a>
                  <CopyButton text={application.link} label="Copy vacancy link" />
                </span>
              </DetailRow>
            )}
            {application.salaryExpectation && (
              <DetailRow label="Salary expectation">{application.salaryExpectation}</DetailRow>
            )}
            <DetailRow label="Applied on">{format(new Date(application.appliedAt), "d MMM yyyy")}</DetailRow>
            <DetailRow label="Last activity">
              <span title={formatExactDateTime(application.lastActivityAt)}>
                {formatRelativeDate(application.lastActivityAt)}
              </span>
            </DetailRow>
            <DetailRow label="Created">{format(new Date(application.createdAt), "d MMM yyyy")}</DetailRow>
          </dl>
        </SectionSurface>
      </div>

      {application.notes && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <SectionLabel>Notes</SectionLabel>
            <CopyButton text={application.notes} label="Copy notes" />
          </div>
          <SectionSurface>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-[var(--gh-text,var(--foreground))]">
              {application.notes}
            </p>
          </SectionSurface>
        </div>
      )}

      {application.hrCallTranscript?.trim() && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <SectionLabel>HR call transcript</SectionLabel>
            <CopyButton text={application.hrCallTranscript} label="Copy HR call transcript" />
          </div>
          <SectionSurface>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-[var(--gh-text,var(--foreground))]">
              {application.hrCallTranscript}
            </p>
          </SectionSurface>
        </div>
      )}

      <ApplicationLinksSection urls={application.sourceUrls} />

      <SourceMaterialsSection
        jobPostingText={application.jobPostingText}
        coverLetterText={application.coverLetterText}
      />

      {application.hrInterviewQuestions && (
        <HrInterviewQuestionsSection
          questions={application.hrInterviewQuestions}
          aiAccessStatus={aiAccess.data?.status}
          aiUsage={aiUsage.data}
        />
      )}

      <div>
        <SectionLabel>Status history</SectionLabel>
        <StatusHistory statusChanges={application.statusChanges} />
      </div>

      <Separator className="bg-[var(--gh-border,var(--border))]" />

      <DeleteApplicationDialog application={application} onDeleted={onDeleted} />
    </div>
  );
}
