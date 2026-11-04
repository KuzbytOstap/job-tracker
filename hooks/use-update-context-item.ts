"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateContextItem } from "@/lib/api";
import { invalidateContextCaches } from "@/lib/sync-profile-caches";
import type { ContextItemSaveResultDTO } from "@/lib/api-types";

type UpdateContextItemVariables = { id: string; text: string };

export function useUpdateContextItem() {
  const queryClient = useQueryClient();

  return useMutation<ContextItemSaveResultDTO, unknown, UpdateContextItemVariables>({
    mutationFn: ({ id, text }) => updateContextItem(id, text),
    onSuccess: () => {
      invalidateContextCaches(queryClient);
    },
  });
}
