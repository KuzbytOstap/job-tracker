"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminUsers } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: () => getAdminUsers(),
    staleTime: 10_000,
  });
}
