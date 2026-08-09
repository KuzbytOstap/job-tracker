"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestAiAccess } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AiAccessStatusResponse } from "@/lib/api-types";

export function useRequestAiAccess() {
  const queryClient = useQueryClient();

  return useMutation<AiAccessStatusResponse, unknown, void>({
    mutationFn: () => requestAiAccess(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.aiAccess(), data);
    },
  });
}
