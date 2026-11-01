"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, updateApplication } from "@/lib/api";
import { useT } from "@/components/i18n/i18n-provider";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import {
  applyApplicationToCaches,
  invalidateApplicationCaches,
  readCachedUpdatedAt,
} from "@/lib/sync-application-caches";
import type { ApplicationDTO, UpdateApplicationPayload } from "@/lib/api-types";

export function useUpdateApplication(id: string) {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation<ApplicationDTO, unknown, UpdateApplicationPayload>({
    mutationFn: (input) =>
      updateApplication(id, {
        expectedUpdatedAt: input.expectedUpdatedAt ?? readCachedUpdatedAt(queryClient, id),
        ...input,
      }),
    onSuccess: (updated) => {
      applyApplicationToCaches(queryClient, updated);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        invalidateApplicationCaches(queryClient, id);
        toast.error(t("errors.updatedElsewhere"));
        return;
      }
      toast.error(getApiErrorMessage(t, error, "errors.saveFailed"));
    },
  });
}
