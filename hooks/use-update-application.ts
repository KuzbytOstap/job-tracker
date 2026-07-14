"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, updateApplication } from "@/lib/api";
import { applyApplicationToCaches } from "@/lib/sync-application-caches";
import type { ApplicationDTO, UpdateApplicationPayload } from "@/lib/api-types";

export function useUpdateApplication(id: string) {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDTO, unknown, UpdateApplicationPayload>({
    mutationFn: (input) => updateApplication(id, input),
    onSuccess: (updated) => {
      applyApplicationToCaches(queryClient, updated);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save changes. Try again.");
    },
  });
}
