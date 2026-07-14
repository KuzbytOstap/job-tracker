import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats(),
    queryFn: getStats,
  });
}
