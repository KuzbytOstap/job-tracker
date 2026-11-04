"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateCoverLetter } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CoverLetterGenerationDTO, GenerateCoverLetterPayload } from "@/lib/api-types";

export function useGenerateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation<CoverLetterGenerationDTO, unknown, GenerateCoverLetterPayload>({
    mutationFn: (payload) => generateCoverLetter(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage() });
    },
  });
}
