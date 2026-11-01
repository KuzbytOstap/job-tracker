"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminPlatformProposals } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useAdminPlatformProposals() {
  return useQuery({
    queryKey: queryKeys.admin.platformProposals(),
    queryFn: () => getAdminPlatformProposals(),
    staleTime: 10_000,
  });
}
