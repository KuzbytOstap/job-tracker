"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, deleteApplication } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { applyApplicationDeletionToCaches, removeApplicationFromListCaches } from "@/lib/sync-application-caches";
import type { ApplicationsListResponse, DeleteResponse } from "@/lib/api-types";

type DeleteContext = {
  previousLists: Array<[readonly unknown[], ApplicationsListResponse | undefined]>;
};

export function useDeleteApplication() {
  const queryClient = useQueryClient();

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
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete the application. Try again.");
    },
    onSuccess: (_result, id) => {
      applyApplicationDeletionToCaches(queryClient, id);
    },
  });
}
