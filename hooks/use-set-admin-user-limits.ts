"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setAdminUserLimits, type SetAdminUserLimitsPayload } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AdminUserOverrides } from "@/lib/api-types";

type SetAdminUserLimitsVariables = SetAdminUserLimitsPayload & { userId: string };

export function useSetAdminUserLimits() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserOverrides, unknown, SetAdminUserLimitsVariables>({
    mutationFn: ({ userId, ...payload }) => setAdminUserLimits(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
