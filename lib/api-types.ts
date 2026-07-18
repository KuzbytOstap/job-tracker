import type { JobApplication, StatusChange, Platform, Status } from "@/app/generated/prisma/client";

type WithStringDates<T, K extends keyof T> = Omit<T, K> & { [P in K]: string };

export type StatusChangeDTO = WithStringDates<StatusChange, "changedAt">;

export type ApplicationDTO = WithStringDates<
  JobApplication,
  "appliedAt" | "lastActivityAt" | "createdAt" | "updatedAt"
> & {
  effectiveStatus: Status;
  isAutoIgnored: boolean;
  statusChanges: StatusChangeDTO[];
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
