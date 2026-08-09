"use client";

import { useQuery } from "@tanstack/react-query";
import { getAiAccessStatus } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useAiAccessStatus() {
  return useQuery({
    queryKey: queryKeys.aiAccess(),
    queryFn: () => getAiAccessStatus(),
    staleTime: 30_000,
  });
}
