"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { moveApplicationToStatus } from "@/lib/board-mutations";
import { queryKeys } from "@/lib/query-keys";
import { upsertApplicationInList } from "@/lib/cache-updates";
import { resolveMoveStatusPayload } from "@/lib/status-transitions";
import {
  applyApplicationToCaches,
  invalidateApplicationCaches,
  parseApplicationsListQueryKey,
  readCachedUpdatedAt,
} from "@/lib/sync-application-caches";
import { useGenerateHrQuestions } from "@/hooks/use-generate-hr-questions";
import { hasVacancySpecificQuestions } from "@/lib/hr-interview-questions";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO, ApplicationListItemDTO, ApplicationsListResponse } from "@/lib/api-types";

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
 * statuses — the pipeline, terminal actions, the test-task branch, and
 * drag-and-drop — goes through this hook instead of calling the API directly.
 * It also owns optimistic concurrency (sending the last-seen updatedAt and
 * recovering from 409 conflicts) and the HR_CALL question-generation follow-up.
 */
export function useMoveApplicationToStatus() {
  const queryClient = useQueryClient();
  const generateHrQuestions = useGenerateHrQuestions();

  return useMutation<ApplicationDTO, unknown, MoveApplicationInput, MoveContext>({
    mutationFn: ({ applicationId, targetStatus }) =>
      moveApplicationToStatus(
        applicationId,
        targetStatus,
        readCachedUpdatedAt(queryClient, applicationId),
      ),
    onMutate: async ({ applicationId, targetStatus }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.detail(applicationId) });

      const previousLists = queryClient.getQueriesData<ApplicationsListResponse>({
        queryKey: queryKeys.applications.lists(),
      });
      const previousDetail = queryClient.getQueryData<ApplicationDTO>(
        queryKeys.applications.detail(applicationId),
      );

      const source =
        previousDetail ??
        previousLists
          .flatMap(([, data]) => data?.applications ?? [])
          .find((application) => application.id === applicationId);

      if (source) {
        const payload = resolveMoveStatusPayload(targetStatus);
        // Keep the real updatedAt (do not bump it) so the concurrency token
        // stays valid; the server response carries the authoritative one.
        const optimisticItem: ApplicationListItemDTO = {
          id: source.id,
          company: source.company,
          position: source.position,
          platform: source.platform,
          link: source.link,
          status: targetStatus,
          effectiveStatus: targetStatus,
          isAutoIgnored: false,
          hasTestTask: payload.hasTestTask ?? source.hasTestTask,
          testTaskDone: source.testTaskDone,
          salaryExpectation: source.salaryExpectation,
          appliedAt: source.appliedAt,
          lastActivityAt: new Date().toISOString(),
          updatedAt: source.updatedAt,
        };

        for (const [key, data] of previousLists) {
          if (!data) continue;
          const params = parseApplicationsListQueryKey(key);
          queryClient.setQueryData(key, upsertApplicationInList(data, optimisticItem, params));
        }

        if (previousDetail) {
          queryClient.setQueryData<ApplicationDTO>(queryKeys.applications.detail(applicationId), {
            ...previousDetail,
            status: targetStatus,
            effectiveStatus: targetStatus,
            isAutoIgnored: false,
            hasTestTask: optimisticItem.hasTestTask,
            lastActivityAt: optimisticItem.lastActivityAt,
          });
        }
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

      if (error instanceof ApiError && error.status === 409) {
        invalidateApplicationCaches(queryClient, applicationId);
        toast.error("This application was updated elsewhere. Refreshed to the latest version.");
        return;
      }

      toast.error(error instanceof ApiError ? error.message : "Couldn't update the status. Try again.");
    },
    onSuccess: (updated) => {
      applyApplicationToCaches(queryClient, updated);

      // After the status update has been saved and returned, kick off the
      // vacancy-specific HR question generation as a separate background
      // request when the application just entered HR_CALL and only the core
      // questions are present so far.
      if (
        updated.status === Status.HR_CALL &&
        !hasVacancySpecificQuestions(updated.hrInterviewQuestions)
      ) {
        generateHrQuestions.mutate(updated.id);
      }
    },
  });
}
