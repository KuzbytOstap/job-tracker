"use client";

import { useQuery } from "@tanstack/react-query";
import { getAutoIgnoreSettings } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useAutoIgnoreSettings() {
  return useQuery({
    queryKey: queryKeys.autoIgnoreSettings(),
    queryFn: () => getAutoIgnoreSettings(),
    staleTime: 60_000,
  });
}
