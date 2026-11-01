"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAutoIgnoreSettings } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AutoIgnoreSettingsDTO } from "@/lib/api-types";

export function useUpdateAutoIgnoreSettings() {
  const queryClient = useQueryClient();

  return useMutation<AutoIgnoreSettingsDTO, unknown, AutoIgnoreSettingsDTO>({
    mutationFn: (payload) => updateAutoIgnoreSettings(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.autoIgnoreSettings(), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
    },
  });
}
