"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCoverLetterExample } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CoverLetterExampleDTO, CoverLetterExamplePayload } from "@/lib/api-types";

export function useCreateCoverLetterExample() {
  const queryClient = useQueryClient();

  return useMutation<CoverLetterExampleDTO, unknown, CoverLetterExamplePayload>({
    mutationFn: (payload) => createCoverLetterExample(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.examples() });
    },
  });
}
