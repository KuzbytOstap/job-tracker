"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCv } from "@/lib/api";
import { invalidateCvCaches } from "@/lib/sync-profile-caches";
import type { CvDTO, UpdateCvPayload } from "@/lib/api-types";

type UpdateCvVariables = { id: string; payload: UpdateCvPayload };

export function useUpdateCv() {
  const queryClient = useQueryClient();

  return useMutation<CvDTO, unknown, UpdateCvVariables>({
    mutationFn: ({ id, payload }) => updateCv(id, payload),
    onSuccess: () => {
      invalidateCvCaches(queryClient);
    },
  });
}
