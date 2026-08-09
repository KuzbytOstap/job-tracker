import type { AiRequestStatus, AiRequestType } from "@/app/generated/prisma/enums";
import type {
  AdminAiRequestDTO,
  AdminAiRequestsListResponse,
  AdminUserOverrides,
  AdminUsersListResponse,
  AiAccessStatusResponse,
  AiGlobalLimitsDTO,
  AiUsageRequestType,
  AiUsageStatusResponse,
  ApiErrorBody,
  ApplicationDTO,
  ApplicationsListResponse,
  CreateApplicationPayload,
  DeleteResponse,
  RequestMoreAiUsageResponse,
  StatsResponse,
  UpdateApplicationPayload,
} from "@/lib/api-types";
import type { SortOption, StatusFilter } from "@/lib/validation";
import type {
  ApplicationExtractionInput,
  ApplicationExtractionResponse,
} from "@/lib/application-extraction";

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }

    throw new ApiError(
      response.status,
      body?.error ?? response.statusText ?? "Request failed",
      body?.details,
    );
  }

  return response.json() as Promise<T>;
}

export type GetApplicationsParams = {
  status?: StatusFilter;
  sort?: SortOption;
  q?: string;
};

export function getApplications(
  params: GetApplicationsParams = {},
): Promise<ApplicationsListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.q) searchParams.set("q", params.q);

  const query = searchParams.toString();
  return request<ApplicationsListResponse>(`/api/applications${query ? `?${query}` : ""}`);
}

export function getApplication(id: string): Promise<ApplicationDTO> {
  return request<ApplicationDTO>(`/api/applications/${id}`);
}

export function createApplication(input: CreateApplicationPayload): Promise<ApplicationDTO> {
  return request<ApplicationDTO>("/api/applications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateApplication(
  id: string,
  input: UpdateApplicationPayload,
): Promise<ApplicationDTO> {
  return request<ApplicationDTO>(`/api/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteApplication(id: string): Promise<DeleteResponse> {
  return request<DeleteResponse>(`/api/applications/${id}`, { method: "DELETE" });
}

/**
 * Follow-up request that asks the server to enrich an application's HR
 * interview questions with vacancy-specific ones. Runs after the status change
 * that moves the application into HR_CALL so that the (possibly slow) AI call
 * never delays the status update itself. Idempotent and safe to retry.
 */
export function generateHrQuestions(id: string): Promise<ApplicationDTO> {
  return request<ApplicationDTO>(`/api/applications/${id}/hr-questions`, { method: "POST" });
}

export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>("/api/stats");
}

export function getAiAccessStatus(): Promise<AiAccessStatusResponse> {
  return request<AiAccessStatusResponse>("/api/ai-access");
}

export function requestAiAccess(): Promise<AiAccessStatusResponse> {
  return request<AiAccessStatusResponse>("/api/ai-access/requests", { method: "POST" });
}

export function getAiUsageStatus(): Promise<AiUsageStatusResponse> {
  return request<AiUsageStatusResponse>("/api/ai-usage");
}

export function requestMoreAiUsage(type: AiUsageRequestType): Promise<RequestMoreAiUsageResponse> {
  return request<RequestMoreAiUsageResponse>("/api/ai-usage/requests", {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

export function extractApplicationFromPosting(
  input: ApplicationExtractionInput,
): Promise<ApplicationExtractionResponse> {
  return request<ApplicationExtractionResponse>("/api/applications/extract", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type GetAdminAiRequestsParams = {
  status?: AiRequestStatus;
  type?: AiRequestType;
};

export function getAdminAiRequests(
  params: GetAdminAiRequestsParams = {},
): Promise<AdminAiRequestsListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.type) searchParams.set("type", params.type);

  const query = searchParams.toString();
  return request<AdminAiRequestsListResponse>(`/api/admin/ai-requests${query ? `?${query}` : ""}`);
}

export type DecideAdminAiRequestPayload = {
  decision: "APPROVED" | "REJECTED";
  decisionNote?: string | null;
  grantedAmount?: number | null;
};

export function decideAdminAiRequest(
  id: string,
  payload: DecideAdminAiRequestPayload,
): Promise<AdminAiRequestDTO> {
  return request<AdminAiRequestDTO>(`/api/admin/ai-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getAdminUsers(): Promise<AdminUsersListResponse> {
  return request<AdminUsersListResponse>("/api/admin/users");
}

export function suspendAdminUserAiAccess(userId: string): Promise<AiAccessStatusResponse> {
  return request<AiAccessStatusResponse>(`/api/admin/users/${userId}/suspend`, { method: "POST" });
}

export function restoreAdminUserAiAccess(userId: string): Promise<AiAccessStatusResponse> {
  return request<AiAccessStatusResponse>(`/api/admin/users/${userId}/restore`, { method: "POST" });
}

export type SetAdminUserLimitsPayload = {
  vacancyGenerationLimit?: number | null;
  hrGenerationLimit?: number | null;
  tokenLimit?: number | null;
};

export function setAdminUserLimits(
  userId: string,
  payload: SetAdminUserLimitsPayload,
): Promise<AdminUserOverrides> {
  return request<AdminUserOverrides>(`/api/admin/users/${userId}/limits`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getAdminSettings(): Promise<AiGlobalLimitsDTO> {
  return request<AiGlobalLimitsDTO>("/api/admin/settings");
}

export type UpdateAdminSettingsPayload = {
  vacancyGenerationLimit?: number;
  hrGenerationLimit?: number;
  tokenLimit?: number;
};

export function updateAdminSettings(payload: UpdateAdminSettingsPayload): Promise<AiGlobalLimitsDTO> {
  return request<AiGlobalLimitsDTO>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
