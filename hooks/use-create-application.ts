"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, createApplication } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { buildOptimisticApplication, upsertApplicationInList } from "@/lib/cache-updates";
import { applyApplicationToCaches, parseApplicationsListQueryKey } from "@/lib/sync-application-caches";
import type { ApplicationDTO, ApplicationsListResponse, CreateApplicationPayload } from "@/lib/api-types";

type CreateContext = {
  previousLists: Array<[readonly unknown[], ApplicationsListResponse | undefined]>;
  optimisticId: string;
};

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDTO, unknown, CreateApplicationPayload, CreateContext>({
    mutationFn: (input) => createApplication(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.lists() });

      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const optimisticApplication = buildOptimisticApplication(input, optimisticId, new Date());

      const previousLists = queryClient.getQueriesData<ApplicationsListResponse>({
        queryKey: queryKeys.applications.lists(),
      });

      for (const [key, data] of previousLists) {
        if (!data) continue;
        const params = parseApplicationsListQueryKey(key);
        queryClient.setQueryData(key, upsertApplicationInList(data, optimisticApplication, params));
      }

      return { previousLists, optimisticId };
    },
    onError: (error, _input, context) => {
      if (context) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error instanceof ApiError ? error.message : "Couldn't create the application. Try again.");
    },
    onSuccess: (created, _input, context) => {
      if (context) {
        queryClient.setQueriesData<ApplicationsListResponse>(
          { queryKey: queryKeys.applications.lists() },
          (data) =>
            data
              ? { ...data, applications: data.applications.filter((a) => a.id !== context.optimisticId) }
              : data,
        );
      }
      applyApplicationToCaches(queryClient, created);
    },
  });
}
