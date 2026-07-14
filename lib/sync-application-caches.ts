import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, type ApplicationsListParams } from "@/lib/query-keys";
import { removeApplicationFromList, upsertApplicationInList } from "@/lib/cache-updates";
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
  const matches = queryClient.getQueriesData<ApplicationsListResponse>({
    queryKey: queryKeys.applications.lists(),
  });
  for (const [key, data] of matches) {
    if (!data) continue;
    const params = parseApplicationsListQueryKey(key);
    queryClient.setQueryData(key, upsertApplicationInList(data, application, params));
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
