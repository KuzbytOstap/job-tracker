"use client";

import { useQuery } from "@tanstack/react-query";
import { getCvUpdateHint } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useCvUpdateHint() {
  return useQuery({
    queryKey: queryKeys.profile.cvUpdateHint(),
    queryFn: () => getCvUpdateHint(),
    staleTime: 15_000,
  });
}
