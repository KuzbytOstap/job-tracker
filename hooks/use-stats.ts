import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/lib/api";

export function useStatsQuery() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });
}
