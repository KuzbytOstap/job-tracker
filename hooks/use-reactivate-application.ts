"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, updateApplication } from "@/lib/api";
import { applyApplicationToCaches } from "@/lib/sync-application-caches";
import type { ApplicationDTO } from "@/lib/api-types";

/**
 * Sends a harmless PATCH with no field changes. The API always bumps
 * lastActivityAt on a successful PATCH, which is enough to move an
 * auto-ignored application (computed, not stored) out of the Ignored column
 * without creating a fake StatusChange or touching the stored status.
 */
export function useReactivateApplication() {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDTO, unknown, string>({
    mutationFn: (id) => updateApplication(id, {}),
    onSuccess: (updated) => {
      applyApplicationToCaches(queryClient, updated);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't mark this application as active. Try again.",
      );
    },
  });
}
