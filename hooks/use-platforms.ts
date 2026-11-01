"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatforms } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function usePlatforms() {
  return useQuery({
    queryKey: queryKeys.platforms(),
    queryFn: () => getPlatforms(),
    staleTime: 60_000,
  });
}
