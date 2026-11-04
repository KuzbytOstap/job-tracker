"use client";

import { useQuery } from "@tanstack/react-query";
import { getCoverLetterExamples } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useCoverLetterExamples() {
  return useQuery({
    queryKey: queryKeys.profile.examples(),
    queryFn: () => getCoverLetterExamples(),
    staleTime: 60_000,
  });
}
