"use client";

import { useQuery } from "@tanstack/react-query";
import { getCvs } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useCvs() {
  return useQuery({
    queryKey: queryKeys.profile.cvs(),
    queryFn: () => getCvs(),
    staleTime: 60_000,
  });
}
