"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateHrQuestions } from "@/lib/api";
import { applyApplicationToCaches } from "@/lib/sync-application-caches";
import type { ApplicationDTO } from "@/lib/api-types";

/**
 * Fires the vacancy-specific HR question generation as a background follow-up
 * to a status change into HR_CALL. Success merges the enriched question set
 * into the caches so an open detail view updates without a page reload. A
 * failure is intentionally silent: the core questions are already saved, and
 * this enhancement is best-effort.
 */
export function useGenerateHrQuestions() {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDTO, unknown, string>({
    mutationFn: (id) => generateHrQuestions(id),
    onSuccess: (updated) => {
      applyApplicationToCaches(queryClient, updated);
    },
  });
}
