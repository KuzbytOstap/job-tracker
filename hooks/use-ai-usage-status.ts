"use client";

import { useQuery } from "@tanstack/react-query";
import { getAiUsageStatus } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Fetches the current UTC-day AI usage snapshot. Only meaningful for an
 * APPROVED user (the server rejects anyone else the same way a real AI call
 * would), so callers gate `enabled` on the current AI access status.
 */
export function useAiUsageStatus(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.aiUsage(),
    queryFn: () => getAiUsageStatus(),
    enabled,
    staleTime: 15_000,
  });
}
