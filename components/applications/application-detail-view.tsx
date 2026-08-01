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
import { HrInterviewQuestionsSection } from "@/components/applications/hr-interview-questions-section";
import { formatExactDateTime, formatRelativeDate } from "@/lib/relative-date";
import { DeleteApplicationDialog } from "@/components/applications/delete-application-dialog";
import { useReactivateApplication } from "@/hooks/use-reactivate-application";
import { STATUS_LABELS } from "@/lib/labels";
import { AUTO_IGNORE_AFTER_DAYS } from "@/lib/status";
import type { ApplicationDTO } from "@/lib/api-types";
import type { ReactNode } from "react";

type ApplicationDetailViewProps = {
  application: ApplicationDTO;
  onEdit: () => void;
  onDeleted: () => void;
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

export function ApplicationDetailView({ application, onEdit, onDeleted }: ApplicationDetailViewProps) {
  const reactivateMutation = useReactivateApplication();

  function handleReactivate() {
    reactivateMutation.mutate(application.id, {
      onSuccess: () => toast.success(`${application.company} marked as active`),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-lg font-semibold leading-tight">{application.company}</h2>
          <p className="truncate text-sm text-muted-foreground">{application.position}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <PlatformBadge platform={application.platform} />
        <StatusBadge status={application.effectiveStatus} />
        {application.hasTestTask && <TestTaskChip done={application.testTaskDone} />}
      </div>

      {application.isAutoIgnored && (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <p className="text-sm">
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

      <Separator />

      <div>
        <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Pipeline</h3>
        <StatusPipeline application={application} />
      </div>

      <TestTaskBranch application={application} />

      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Terminal actions
        </h3>
        <TerminalStatusActions application={application} />
      </div>

      <Separator />

      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Test task</h3>
        <TestTaskControls application={application} />
      </div>

      <Separator />

      <dl className="grid grid-cols-2 gap-3">
        {application.link && (
          <DetailRow label="Vacancy link">
            <a
              href={application.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
            >
              Open link
              <ExternalLink className="size-3.5" />
            </a>
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

      {application.notes && (
        <DetailRow label="Notes">
          <p className="whitespace-pre-wrap text-sm">{application.notes}</p>
        </DetailRow>
      )}

      {application.hrCallTranscript?.trim() && (
        <DetailRow label="HR call transcript">
          <p className="whitespace-pre-wrap text-sm">{application.hrCallTranscript}</p>
        </DetailRow>
      )}

      <SourceMaterialsSection
        jobPostingText={application.jobPostingText}
        coverLetterText={application.coverLetterText}
      />

      {application.hrInterviewQuestions && (
        <>
          <Separator />
          <HrInterviewQuestionsSection questions={application.hrInterviewQuestions} />
        </>
      )}

      <Separator />

      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Status history
        </h3>
        <StatusHistory statusChanges={application.statusChanges} />
      </div>

      <DeleteApplicationDialog application={application} onDeleted={onDeleted} />
    </div>
  );
}
