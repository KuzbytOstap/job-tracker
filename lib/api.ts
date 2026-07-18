import type {
  ApiErrorBody,
  ApplicationDTO,
  ApplicationsListResponse,
  CreateApplicationPayload,
  DeleteResponse,
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

export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>("/api/stats");
}

export function extractApplicationFromPosting(
  input: ApplicationExtractionInput,
): Promise<ApplicationExtractionResponse> {
  return request<ApplicationExtractionResponse>("/api/applications/extract", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
