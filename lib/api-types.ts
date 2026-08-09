import type {
  AiAccessStatus,
  AiRequestStatus,
  AiRequestType,
  JobApplication,
  Role,
  StatusChange,
  Platform,
  Status,
} from "@/app/generated/prisma/client";
import type { HrInterviewQuestionSet } from "@/lib/hr-interview-questions";

type WithStringDates<T, K extends keyof T> = Omit<T, K> & { [P in K]: string };

export type StatusChangeDTO = WithStringDates<StatusChange, "changedAt">;

export type ApplicationDTO = Omit<
  WithStringDates<JobApplication, "appliedAt" | "lastActivityAt" | "createdAt" | "updatedAt">,
  | "hrInterviewQuestions"
  | "hrQuestionsGeneratedAt"
  | "userId"
  | "hrEnhancementClaimedAt"
  | "hrEnhancementClaimToken"
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

export type AiAccessStatusResponse = {
  status: AiAccessStatus;
};

export type AiUsageRequestType = "VACANCY_LIMIT" | "HR_LIMIT" | "TOKEN_LIMIT";

export type AiQuotaStatus = {
  used: number;
  limit: number;
  exhausted: boolean;
  pendingRequest: boolean;
};

export type AiUsageStatusResponse = {
  resetAt: string;
  vacancy: AiQuotaStatus;
  hr: AiQuotaStatus;
  tokens: AiQuotaStatus;
};

export type RequestMoreAiUsageResponse = {
  status: "PENDING";
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

export type AdminUserRef = {
  id: string;
  name: string | null;
  email: string | null;
};

export type AdminAiRequestDTO = {
  id: string;
  type: AiRequestType;
  status: AiRequestStatus;
  quotaDate: string | null;
  message: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  grantedAmount: number | null;
  createdAt: string;
  updatedAt: string;
  user: AdminUserRef;
  decidedByUser: AdminUserRef | null;
};

export type AdminAiRequestsListResponse = {
  requests: AdminAiRequestDTO[];
};

export type AdminQuotaAmounts = {
  vacancy: number;
  hr: number;
  tokens: number;
};

export type AdminUserOverrides = {
  vacancy: number | null;
  hr: number | null;
  tokens: number | null;
};

export type AdminUserDTO = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  aiAccessStatus: AiAccessStatus;
  usage: AdminQuotaAmounts;
  limits: AdminQuotaAmounts;
  overrides: AdminUserOverrides;
};

export type AdminUsersListResponse = {
  users: AdminUserDTO[];
};

export type AiGlobalLimitsDTO = {
  vacancyGenerationLimit: number;
  hrGenerationLimit: number;
  tokenLimit: number;
  updatedAt: string;
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
