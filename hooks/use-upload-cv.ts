"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadCv } from "@/lib/api";
import { invalidateCvCaches } from "@/lib/sync-profile-caches";
import type { CvUploadResultDTO } from "@/lib/api-types";

export function useUploadCv() {
  const queryClient = useQueryClient();

  return useMutation<CvUploadResultDTO, unknown, FormData>({
    mutationFn: (formData) => uploadCv(formData),
    onSuccess: () => {
      invalidateCvCaches(queryClient);
    },
  });
}
