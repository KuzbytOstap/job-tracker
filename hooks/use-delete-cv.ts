"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCv } from "@/lib/api";
import { invalidateCvCaches } from "@/lib/sync-profile-caches";

export function useDeleteCv() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: (id) => deleteCv(id),
    onSuccess: () => {
      invalidateCvCaches(queryClient);
    },
  });
}
