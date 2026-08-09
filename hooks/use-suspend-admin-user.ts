"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { suspendAdminUserAiAccess } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AiAccessStatusResponse } from "@/lib/api-types";

export function useSuspendAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<AiAccessStatusResponse, unknown, string>({
    mutationFn: (userId) => suspendAdminUserAiAccess(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
