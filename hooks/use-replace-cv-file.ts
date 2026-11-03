"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { replaceCvFile } from "@/lib/api";
import { invalidateCvCaches } from "@/lib/sync-profile-caches";
import type { CvUploadResultDTO } from "@/lib/api-types";

type ReplaceCvFileVariables = { id: string; formData: FormData };

export function useReplaceCvFile() {
  const queryClient = useQueryClient();

  return useMutation<CvUploadResultDTO, unknown, ReplaceCvFileVariables>({
    mutationFn: ({ id, formData }) => replaceCvFile(id, formData),
    onSuccess: () => {
      invalidateCvCaches(queryClient);
    },
  });
}
