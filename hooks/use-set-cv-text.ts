"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setCvText } from "@/lib/api";
import { invalidateCvCaches } from "@/lib/sync-profile-caches";
import type { CvDTO } from "@/lib/api-types";

type SetCvTextVariables = { id: string; text: string };

export function useSetCvText() {
  const queryClient = useQueryClient();

  return useMutation<CvDTO, unknown, SetCvTextVariables>({
    mutationFn: ({ id, text }) => setCvText(id, text),
    onSuccess: () => {
      invalidateCvCaches(queryClient);
    },
  });
}
