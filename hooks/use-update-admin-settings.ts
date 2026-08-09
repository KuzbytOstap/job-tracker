"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAdminSettings, type UpdateAdminSettingsPayload } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AiGlobalLimitsDTO } from "@/lib/api-types";

/**
 * Updates the global AI default limits. Also invalidates the admin users
 * list — any user without a permanent override has their effective limit
 * derived from these defaults.
 */
export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation<AiGlobalLimitsDTO, unknown, UpdateAdminSettingsPayload>({
    mutationFn: (payload) => updateAdminSettings(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.admin.settings(), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
