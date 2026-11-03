"use client";

import { useMutation } from "@tanstack/react-query";
import { suggestCvUpdates } from "@/lib/api";
import type { CvSuggestionsResponseDTO } from "@/lib/api-types";

export function useSuggestCvUpdates() {
  return useMutation<CvSuggestionsResponseDTO, unknown, void>({
    mutationFn: () => suggestCvUpdates(),
  });
}
