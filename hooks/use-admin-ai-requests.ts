"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminAiRequests } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Fetches the full admin AI request queue (pending first, then newest-first
 * history), unfiltered — callers split it into pending/history buckets
 * client-side instead of issuing separate requests.
 */
export function useAdminAiRequests() {
  return useQuery({
    queryKey: queryKeys.admin.aiRequests(),
    queryFn: () => getAdminAiRequests(),
    staleTime: 10_000,
  });
}
