"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCoverLetterExample } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CoverLetterExampleDTO, CoverLetterExamplePayload } from "@/lib/api-types";

type UpdateCoverLetterExampleVariables = { id: string; payload: Partial<CoverLetterExamplePayload> };

export function useUpdateCoverLetterExample() {
  const queryClient = useQueryClient();

  return useMutation<CoverLetterExampleDTO, unknown, UpdateCoverLetterExampleVariables>({
    mutationFn: ({ id, payload }) => updateCoverLetterExample(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.examples() });
    },
  });
}
