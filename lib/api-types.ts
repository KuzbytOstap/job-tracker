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

export type CustomPlatformRefDTO = {
  id: string;
  name: string;
  colorKey: string;
};

export type ApplicationDTO = Omit<
  WithStringDates<JobApplication, "appliedAt" | "lastActivityAt" | "createdAt" | "updatedAt">,
  | "hrInterviewQuestions"
  | "hrQuestionsGeneratedAt"
  | "userId"
  | "hrEnhancementClaimedAt"
  | "hrEnhancementClaimToken"
  | "reviewReasons"
  | "suggestedPlatformName"
  | "customPlatformId"
> & {
  effectiveStatus: Status;
  isAutoIgnored: boolean;
  customPlatformId?: string | null;
  customPlatform?: CustomPlatformRefDTO | null;
  reviewReasons?: string[];
  suggestedPlatformName?: string | null;
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
  customPlatformId?: string | null;
  customPlatform?: CustomPlatformRefDTO | null;
  reviewReasons?: string[];
  suggestedPlatformName?: string | null;
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

export type LocaleSettingsDTO = {
  locale: "en" | "uk" | null;
};

export type AutoIgnoreSettingsDTO = {
  autoIgnoreAfterDays: number | null;
};

export type SalaryPeriodValue = "HOUR" | "MONTH" | "YEAR";
export type EmploymentTypeValue = "FULL_TIME" | "PART_TIME" | "CONTRACT";
export type WorkFormatValue = "REMOTE" | "ONSITE" | "HYBRID";

export type ProfileDTO = {
  firstName: string | null;
  lastName: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: {
    street: string | null;
    postalCode: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
  };
  salary: {
    amount: number | null;
    currency: string | null;
    period: SalaryPeriodValue | null;
  };
  employmentTypes: EmploymentTypeValue[];
  workFormats: WorkFormatValue[];
  coverLetterPrompt: string | null;
  defaultCoverLetterPrompt: string;
};

export type ContextItemWeightValue = "COVERED" | "SUBSTANTIAL" | "MINOR";

export type ContextItemDTO = {
  id: string;
  text: string;
  weight: ContextItemWeightValue | null;
  impact: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ContextScoringDTO = {
  scored: number;
  remaining: number;
  skipped: string | null;
};

export type ContextItemSaveResultDTO = {
  item: ContextItemDTO;
  scoring: ContextScoringDTO;
};

export type CvDTO = {
  id: string;
  label: string;
  language: string | null;
  isPrimary: boolean;
  fileName: string;
  fileSize: number;
  hasText: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CvIdentitySuggestionsDTO = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
};

export type CvUploadResultDTO = {
  cv: CvDTO;
  textStatus: "extracted" | "missing";
  identitySuggestions: CvIdentitySuggestionsDTO | null;
  skippedReason: string | null;
};

export type CvUpdateHintDTO = {
  visible: boolean;
  substantialCount: number;
  snoozed: boolean;
};

export type CvSuggestionDTO = {
  itemId: string;
  bullet: string;
};

export type CoverLetterExampleDTO = {
  id: string;
  vacancyText: string;
  letterText: string;
  createdAt: string;
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
  profile: AiQuotaStatus;
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

export type CapturePageResponse =
  | {
      status: "created";
      application: ApplicationDTO;
      extraction: "ai" | "fallback";
      fallbackReason: string | null;
    }
  | { status: "duplicate"; application: ApplicationDTO }
  | { status: "needs_confirmation"; reason: "not_vacancy" };

export type PlatformOptionScope = "builtin" | "global" | "own";

export type PlatformOptionDTO = {
  value: string;
  label: string;
  platform: Platform;
  customPlatformId: string | null;
  colorKey: string | null;
  scope: PlatformOptionScope;
};

export type PlatformsResponse = {
  platforms: PlatformOptionDTO[];
};

export type CreatePlatformResponse = {
  platform: PlatformOptionDTO;
  created: boolean;
};

export type AdminPlatformProposalDTO = {
  id: string;
  name: string;
  colorKey: string;
  owners: AdminUserRef[];
  applicationCount: number;
  createdAt: string;
};

export type AdminPlatformProposalsResponse = {
  proposals: AdminPlatformProposalDTO[];
};

export type CreateApplicationPayload = {
  company: string;
  position: string;
  platform: Platform;
  customPlatformId?: string | null;
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
  profile: number;
  tokens: number;
};

export type AdminUserOverrides = {
  vacancy: number | null;
  hr: number | null;
  profile: number | null;
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
  profileGenerationLimit: number;
  tokenLimit: number;
  updatedAt: string;
};

export type UpdateApplicationPayload = Partial<CreateApplicationPayload> & {
  status?: Status;
  hrCallTranscript?: string | null;
  reviewReasons?: string[];
  suggestedPlatformName?: string | null;
  sourceUrls?: string[];
  // Optimistic-concurrency token: the `updatedAt` the client last saw. When
  // present, the server only applies the update if the stored row still
  // matches, otherwise it responds 409 Conflict.
  expectedUpdatedAt?: string;
};
