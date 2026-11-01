"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateApplication } from "@/lib/api";
import { useT } from "@/components/i18n/i18n-provider";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
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
  const t = useT();

  return useMutation<ApplicationDTO, unknown, string>({
    mutationFn: (id) => updateApplication(id, {}),
    onSuccess: (updated) => {
      applyApplicationToCaches(queryClient, updated);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(t, error, "errors.reactivateFailed"));
    },
  });
}
