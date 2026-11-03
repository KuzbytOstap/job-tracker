"use client";

import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: () => getProfile(),
    staleTime: 60_000,
  });
}
