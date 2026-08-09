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

// Lightweight projection returned by the list endpoint. It carries only what
// Kanban cards, mobile lists, filters, sorting, drag-and-drop, and optimistic
// cache updates need — never the heavy detail fields (job posting, cover
// letter, HR questions, notes, status history). Full detail is fetched
// separately through the single-application endpoint as an ApplicationDTO.
export type ApplicationListItemDTO = {
  id: string;
  company: string;
  position: string;
  platform: Platform;
  link: string | null;
  status: Status;
  effectiveStatus: Status;
  isAutoIgnored: boolean;
  hasTestTask: boolean;
  testTaskDone: boolean;
  salaryExpectation: string | null;
  appliedAt: string;
  lastActivityAt: string;
  updatedAt: string;
};

export type ApplicationsListResponse = {
  applications: ApplicationListItemDTO[];
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
  hrCallTranscript?: string | null;
  sourceUrls?: string[];
  // Optimistic-concurrency token: the `updatedAt` the client last saw. When
  // present, the server only applies the update if the stored row still
  // matches, otherwise it responds 409 Conflict.
  expectedUpdatedAt?: string;
};
