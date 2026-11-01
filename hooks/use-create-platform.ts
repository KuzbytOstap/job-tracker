"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPlatform, type CreatePlatformPayload } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CreatePlatformResponse } from "@/lib/api-types";

export function useCreatePlatform() {
  const queryClient = useQueryClient();

  return useMutation<CreatePlatformResponse, unknown, CreatePlatformPayload>({
    mutationFn: (payload) => createPlatform(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms() });
    },
  });
}
