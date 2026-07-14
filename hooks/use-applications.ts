import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getApplications, type GetApplicationsParams } from "@/lib/api";

export function useApplicationsQuery(params: GetApplicationsParams) {
  const status = params.status ?? "ALL";
  const sort = params.sort ?? "newest";
  const q = params.q ?? "";

  return useQuery({
    queryKey: ["applications", status, sort, q],
    queryFn: () => getApplications({ status, sort, q }),
    placeholderData: keepPreviousData,
  });
}
