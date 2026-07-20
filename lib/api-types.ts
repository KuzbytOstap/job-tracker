import type { JobApplication, StatusChange, Platform, Status } from "@/app/generated/prisma/client";
import type { HrInterviewQuestionSet } from "@/lib/hr-interview-questions";

type WithStringDates<T, K extends keyof T> = Omit<T, K> & { [P in K]: string };

export type StatusChangeDTO = WithStringDates<StatusChange, "changedAt">;

export type ApplicationDTO = Omit<
  WithStringDates<JobApplication, "appliedAt" | "lastActivityAt" | "createdAt" | "updatedAt">,
  "hrInterviewQuestions" | "hrQuestionsGeneratedAt"
> & {
  effectiveStatus: Status;
  isAutoIgnored: boolean;
  statusChanges: StatusChangeDTO[];
  hrInterviewQuestions: HrInterviewQuestionSet | null;
  hrQuestionsGeneratedAt: string | null;
};

export type ApplicationsListResponse = {
  applications: ApplicationDTO[];
  total: number;
};

export type FunnelStage = {
  count: number;
  percentage: number;
};

export type StatsResponse = {
  total: number;
  counts: Record<Status, number>;
  waitingForReply: number;
  repliedOrFurther: number;
  interviewsOrFurther: number;
  offers: number;
  funnel: {
    applied: FunnelStage;
    replied: FunnelStage;
    interviews: FunnelStage;
    offers: FunnelStage;
  };
};

export type ApiErrorBody = {
  error: string;
  details?: unknown;
};

export type DeleteResponse = {
  success: true;
};

export type CreateApplicationPayload = {
  company: string;
  position: string;
  platform: Platform;
  link?: string;
  salaryExpectation?: string;
  notes?: string;
  hasTestTask?: boolean;
  testTaskDone?: boolean;
  appliedAt?: string;
  jobPostingText?: string | null;
  coverLetterText?: string | null;
};

export type UpdateApplicationPayload = Partial<CreateApplicationPayload> & {
  status?: Status;
};
