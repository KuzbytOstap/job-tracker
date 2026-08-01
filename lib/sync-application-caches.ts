import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, type ApplicationsListParams } from "@/lib/query-keys";
import {
  removeApplicationFromList,
  toApplicationListItem,
  upsertApplicationInList,
} from "@/lib/cache-updates";
import type { ApplicationDTO, ApplicationsListResponse } from "@/lib/api-types";

export function parseApplicationsListQueryKey(key: readonly unknown[]): ApplicationsListParams {
  const [, , status, sort, q] = key as [
    unknown,
    unknown,
    ApplicationsListParams["status"],
    ApplicationsListParams["sort"],
    string,
  ];
  return { status, sort, q };
}

export function syncApplicationIntoListCaches(queryClient: QueryClient, application: ApplicationDTO): void {
  const listItem = toApplicationListItem(application);
  const matches = queryClient.getQueriesData<ApplicationsListResponse>({
    queryKey: queryKeys.applications.lists(),
  });
  for (const [key, data] of matches) {
    if (!data) continue;
    const params = parseApplicationsListQueryKey(key);
    queryClient.setQueryData(key, upsertApplicationInList(data, listItem, params));
  }
}

export function removeApplicationFromListCaches(queryClient: QueryClient, applicationId: string): void {
  const matches = queryClient.getQueriesData<ApplicationsListResponse>({
    queryKey: queryKeys.applications.lists(),
  });
  for (const [key, data] of matches) {
    if (!data) continue;
    queryClient.setQueryData(key, removeApplicationFromList(data, applicationId));
  }
}

export function applyApplicationToCaches(queryClient: QueryClient, application: ApplicationDTO): void {
  syncApplicationIntoListCaches(queryClient, application);
  queryClient.setQueryData(queryKeys.applications.detail(application.id), application);
  queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
}

export function applyApplicationDeletionToCaches(queryClient: QueryClient, applicationId: string): void {
  removeApplicationFromListCaches(queryClient, applicationId);
  queryClient.removeQueries({ queryKey: queryKeys.applications.detail(applicationId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
}

/**
 * Reads the authoritative `updatedAt` currently held in cache for an
 * application — preferring the full detail entry, then any list entry. Used as
 * the optimistic-concurrency token sent with updates so the server can reject
 * writes based on stale data.
 */
export function readCachedUpdatedAt(queryClient: QueryClient, applicationId: string): string | undefined {
  const detail = queryClient.getQueryData<ApplicationDTO>(queryKeys.applications.detail(applicationId));
  if (detail) return detail.updatedAt;

  const lists = queryClient.getQueriesData<ApplicationsListResponse>({
    queryKey: queryKeys.applications.lists(),
  });
  for (const [, data] of lists) {
    const match = data?.applications.find((item) => item.id === applicationId);
    if (match) return match.updatedAt;
  }

  return undefined;
}

/**
 * Recovers from a concurrent-update (409) conflict by discarding the stale
 * optimistic state and refetching the affected application, the lists, and the
 * stats from the server.
 */
export function invalidateApplicationCaches(queryClient: QueryClient, applicationId: string): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.applications.detail(applicationId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.applications.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
}
