import { useQuery } from "@tanstack/react-query";
import { getApplication } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useApplicationQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.applications.detail(id ?? ""),
    queryFn: () => getApplication(id as string),
    enabled: id != null,
  });
}
