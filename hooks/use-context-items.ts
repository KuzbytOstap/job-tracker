"use client";

import { useQuery } from "@tanstack/react-query";
import { getContextItems } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useContextItems() {
  return useQuery({
    queryKey: queryKeys.profile.contextItems(),
    queryFn: () => getContextItems(),
    staleTime: 60_000,
  });
}
