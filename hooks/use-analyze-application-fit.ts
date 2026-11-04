"use client";

import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import { analyzeApplicationFit } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { applyApplicationToCaches } from "@/lib/sync-application-caches";
import type { FitAnalysisOutcomeDTO } from "@/lib/api-types";

export const analyzeApplicationFitMutationKey = ["analyze-application-fit"] as const;

export function useAnalyzeApplicationFit() {
  const queryClient = useQueryClient();

  return useMutation<FitAnalysisOutcomeDTO, unknown, string>({
    mutationKey: analyzeApplicationFitMutationKey,
    mutationFn: (applicationId) => analyzeApplicationFit(applicationId),
    onSuccess: (outcome) => {
      if (outcome.status === "ok") {
        applyApplicationToCaches(queryClient, outcome.application);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage() });
    },
  });
}

export function useIsAnalyzingApplicationFit(applicationId: string): boolean {
  const running = useMutationState({
    filters: {
      mutationKey: analyzeApplicationFitMutationKey,
      status: "pending",
      predicate: (mutation) => mutation.state.variables === applicationId,
    },
    select: (mutation) => mutation.state.variables,
  });

  return running.length > 0;
}
