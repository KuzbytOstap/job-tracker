"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteContextItem } from "@/lib/api";
import { invalidateContextCaches } from "@/lib/sync-profile-caches";

export function useDeleteContextItem() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: (id) => deleteContextItem(id),
    onSuccess: () => {
      invalidateContextCaches(queryClient);
    },
  });
}
