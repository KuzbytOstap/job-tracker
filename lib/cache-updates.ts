import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO, ApplicationsListResponse, CreateApplicationPayload } from "@/lib/api-types";
import type { ApplicationsListParams } from "@/lib/query-keys";
import type { SortOption } from "@/lib/validation";

function matchesStatus(application: ApplicationDTO, status: ApplicationsListParams["status"]): boolean {
  return status === "ALL" || application.effectiveStatus === status;
}

function matchesSearch(application: ApplicationDTO, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    application.company.toLowerCase().includes(needle) ||
    application.position.toLowerCase().includes(needle)
  );
}

export function applicationMatchesListParams(
  application: ApplicationDTO,
  params: ApplicationsListParams,
): boolean {
  return matchesStatus(application, params.status) && matchesSearch(application, params.q);
}

function compareApplications(a: ApplicationDTO, b: ApplicationDTO, sort: SortOption): number {
  switch (sort) {
    case "newest":
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    case "oldest":
      return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
    case "activity":
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    case "company":
      return a.company.localeCompare(b.company, undefined, { sensitivity: "base" });
  }
}

export function sortApplicationDTOs(applications: ApplicationDTO[], sort: SortOption): ApplicationDTO[] {
  return [...applications].sort((a, b) => compareApplications(a, b, sort));
}

/**
 * Upserts an application into a cached list response, honoring that list's own
 * status/search/sort params. Inserts or replaces when the application matches;
 * removes it when it no longer matches (e.g. it moved to a different status).
 */
export function upsertApplicationInList(
  listResponse: ApplicationsListResponse,
  application: ApplicationDTO,
  params: ApplicationsListParams,
): ApplicationsListResponse {
  const withoutExisting = listResponse.applications.filter((item) => item.id !== application.id);
  const shouldInclude = applicationMatchesListParams(application, params);
  const nextApplications = shouldInclude
    ? sortApplicationDTOs([...withoutExisting, application], params.sort)
    : withoutExisting;

  if (nextApplications.length === listResponse.applications.length) {
    const unchanged = nextApplications.every((item, index) => item === listResponse.applications[index]);
    if (unchanged) return listResponse;
  }

  return { applications: nextApplications, total: nextApplications.length };
}

export function removeApplicationFromList(
  listResponse: ApplicationsListResponse,
  applicationId: string,
): ApplicationsListResponse {
  const nextApplications = listResponse.applications.filter((item) => item.id !== applicationId);
  if (nextApplications.length === listResponse.applications.length) {
    return listResponse;
  }
  return { applications: nextApplications, total: nextApplications.length };
}

export function buildOptimisticApplication(
  input: CreateApplicationPayload,
  id: string,
  now: Date,
): ApplicationDTO {
  const nowIso = now.toISOString();
  return {
    id,
    company: input.company,
    position: input.position,
    platform: input.platform,
    link: input.link ?? null,
    status: Status.APPLIED,
    hasTestTask: input.hasTestTask ?? false,
    testTaskDone: input.testTaskDone ?? false,
    salaryExpectation: input.salaryExpectation ?? null,
    notes: input.notes ?? null,
    appliedAt: input.appliedAt ?? nowIso,
    lastActivityAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
    effectiveStatus: Status.APPLIED,
    isAutoIgnored: false,
    statusChanges: [],
  };
}

export function isOptimisticApplicationId(id: string): boolean {
  return id.startsWith("optimistic-");
}
