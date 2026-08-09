"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreAdminUserAiAccess } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AiAccessStatusResponse } from "@/lib/api-types";

export function useRestoreAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<AiAccessStatusResponse, unknown, string>({
    mutationFn: (userId) => restoreAdminUserAiAccess(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
