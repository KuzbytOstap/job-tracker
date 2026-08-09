"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestMoreAiUsage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AiUsageRequestType, AiUsageStatusResponse, RequestMoreAiUsageResponse } from "@/lib/api-types";

const USAGE_FIELD_BY_REQUEST_TYPE: Record<AiUsageRequestType, "vacancy" | "hr" | "tokens"> = {
  VACANCY_LIMIT: "vacancy",
  HR_LIMIT: "hr",
  TOKEN_LIMIT: "tokens",
};

/**
 * Requests more usage for one exhausted quota. On success, flips that
 * quota's `pendingRequest` flag directly in the cached usage snapshot so the
 * UI shows the pending state immediately — and, since the flag is part of
 * the cache, still shows it after navigating away and back without waiting
 * on a refetch.
 */
export function useRequestMoreAiUsage() {
  const queryClient = useQueryClient();

  return useMutation<RequestMoreAiUsageResponse, unknown, AiUsageRequestType>({
    mutationFn: (type) => requestMoreAiUsage(type),
    onSuccess: (_data, type) => {
      const field = USAGE_FIELD_BY_REQUEST_TYPE[type];
      queryClient.setQueryData<AiUsageStatusResponse>(queryKeys.aiUsage(), (current) =>
        current ? { ...current, [field]: { ...current[field], pendingRequest: true } } : current,
      );
    },
  });
}
