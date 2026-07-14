import { useQuery } from "@tanstack/react-query";
import { getApplications, type GetApplicationsParams } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useApplicationsQuery(params: GetApplicationsParams) {
  const status = params.status ?? "ALL";
  const sort = params.sort ?? "newest";
  const q = params.q ?? "";

  return useQuery({
    queryKey: queryKeys.applications.list({ status, sort, q }),
    queryFn: () => getApplications({ status, sort, q }),
    placeholderData: (previousData, previousQuery) => {
      if (!previousQuery) return undefined;
      const previousStatus = previousQuery.queryKey[2];
      return previousStatus === status ? previousData : undefined;
    },
  });
}
