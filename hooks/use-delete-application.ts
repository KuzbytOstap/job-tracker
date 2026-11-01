"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteApplication } from "@/lib/api";
import { useT } from "@/components/i18n/i18n-provider";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { applyApplicationDeletionToCaches, removeApplicationFromListCaches } from "@/lib/sync-application-caches";
import type { ApplicationsListResponse, DeleteResponse } from "@/lib/api-types";

type DeleteContext = {
  previousLists: Array<[readonly unknown[], ApplicationsListResponse | undefined]>;
};

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation<DeleteResponse, unknown, string, DeleteContext>({
    mutationFn: (id) => deleteApplication(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.lists() });

      const previousLists = queryClient.getQueriesData<ApplicationsListResponse>({
        queryKey: queryKeys.applications.lists(),
      });

      removeApplicationFromListCaches(queryClient, id);

      return { previousLists };
    },
    onError: (error, _id, context) => {
      if (context) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(getApiErrorMessage(t, error, "errors.deleteFailed"));
    },
    onSuccess: (_result, id) => {
      applyApplicationDeletionToCaches(queryClient, id);
    },
  });
}
