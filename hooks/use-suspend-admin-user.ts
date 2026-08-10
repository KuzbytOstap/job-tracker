"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { suspendAdminUserAiAccess } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { AiAccessStatus } from "@/app/generated/prisma/enums";
import type { AdminUsersListResponse, AiAccessStatusResponse } from "@/lib/api-types";

type SuspendAdminUserContext = {
  previousUsers: AdminUsersListResponse | undefined;
};

export function useSuspendAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<AiAccessStatusResponse, unknown, string, SuspendAdminUserContext>({
    mutationFn: (userId) => suspendAdminUserAiAccess(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.users() });

      const previousUsers = queryClient.getQueryData<AdminUsersListResponse>(queryKeys.admin.users());

      if (previousUsers) {
        queryClient.setQueryData<AdminUsersListResponse>(queryKeys.admin.users(), {
          ...previousUsers,
          users: previousUsers.users.map((user) =>
            user.id === userId ? { ...user, aiAccessStatus: AiAccessStatus.SUSPENDED } : user,
          ),
        });
      }

      return { previousUsers };
    },
    onError: (_error, _userId, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(queryKeys.admin.users(), context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
