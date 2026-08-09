"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSettings } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: () => getAdminSettings(),
    staleTime: 10_000,
  });
}
