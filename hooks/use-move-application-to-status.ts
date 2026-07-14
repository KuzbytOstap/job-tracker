"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { moveApplicationToStatus } from "@/lib/board-mutations";
import { queryKeys } from "@/lib/query-keys";
import { upsertApplicationInList } from "@/lib/cache-updates";
import { resolveMoveStatusPayload } from "@/lib/status-transitions";
import { applyApplicationToCaches, parseApplicationsListQueryKey } from "@/lib/sync-application-caches";
import type { ApplicationDTO, ApplicationsListResponse } from "@/lib/api-types";
import type { Status } from "@/app/generated/prisma/enums";

export type MoveApplicationInput = {
  applicationId: string;
  targetStatus: Status;
};

type MoveContext = {
  previousLists: Array<[readonly unknown[], ApplicationsListResponse | undefined]>;
  previousDetail: ApplicationDTO | undefined;
};

/**
 * Centralized status-change mutation. Anything that moves an application between
 * statuses — the pipeline, terminal actions, the test-task branch, and eventually
 * drag-and-drop — goes through this hook instead of calling the API directly.
 */
export function useMoveApplicationToStatus() {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDTO, unknown, MoveApplicationInput, MoveContext>({
    mutationFn: ({ applicationId, targetStatus }) => moveApplicationToStatus(applicationId, targetStatus),
    onMutate: async ({ applicationId, targetStatus }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.detail(applicationId) });

      const previousLists = queryClient.getQueriesData<ApplicationsListResponse>({
        queryKey: queryKeys.applications.lists(),
      });
      const previousDetail = queryClient.getQueryData<ApplicationDTO>(
        queryKeys.applications.detail(applicationId),
      );

      const existing =
        previousDetail ??
        previousLists
          .flatMap(([, data]) => data?.applications ?? [])
          .find((application) => application.id === applicationId);

      if (existing) {
        const payload = resolveMoveStatusPayload(targetStatus);
        const optimistic: ApplicationDTO = {
          ...existing,
          status: targetStatus,
          effectiveStatus: targetStatus,
          isAutoIgnored: false,
          hasTestTask: payload.hasTestTask ?? existing.hasTestTask,
          lastActivityAt: new Date().toISOString(),
        };

        for (const [key, data] of previousLists) {
          if (!data) continue;
          const params = parseApplicationsListQueryKey(key);
          queryClient.setQueryData(key, upsertApplicationInList(data, optimistic, params));
        }
        queryClient.setQueryData(queryKeys.applications.detail(applicationId), optimistic);
      }

      return { previousLists, previousDetail };
    },
    onError: (error, { applicationId }, context) => {
      if (context) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
        queryClient.setQueryData(queryKeys.applications.detail(applicationId), context.previousDetail);
      }
      toast.error(error instanceof ApiError ? error.message : "Couldn't update the status. Try again.");
    },
    onSuccess: (updated) => {
      applyApplicationToCaches(queryClient, updated);
    },
  });
}
