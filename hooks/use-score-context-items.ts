"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scoreContextItems } from "@/lib/api";
import { invalidateContextCaches } from "@/lib/sync-profile-caches";
import type { ContextScoringDTO } from "@/lib/api-types";

export function useScoreContextItems() {
  const queryClient = useQueryClient();

  return useMutation<ContextScoringDTO, unknown, void>({
    mutationFn: () => scoreContextItems(),
    onSuccess: (data) => {
      if (data.scored > 0) {
        invalidateContextCaches(queryClient);
      }
    },
  });
}
