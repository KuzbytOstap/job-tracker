"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContextItem } from "@/lib/api";
import { invalidateContextCaches } from "@/lib/sync-profile-caches";
import type { ContextItemSaveResultDTO } from "@/lib/api-types";

export function useCreateContextItem() {
  const queryClient = useQueryClient();

  return useMutation<ContextItemSaveResultDTO, unknown, string>({
    mutationFn: (text) => createContextItem(text),
    onSuccess: () => {
      invalidateContextCaches(queryClient);
    },
  });
}
