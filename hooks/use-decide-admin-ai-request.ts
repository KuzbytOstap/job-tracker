"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decideAdminAiRequest, type DecideAdminAiRequestPayload } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AdminAiRequestDTO } from "@/lib/api-types";

type DecideAdminAiRequestVariables = DecideAdminAiRequestPayload & { requestId: string };

/**
 * Approves or rejects one AI access/usage request. The server response is
 * authoritative, so on success this only invalidates the request queue and
 * (since an approved usage-limit request grants a same-day bonus, or an
 * AI_ACCESS decision flips the user's access status) the users list, rather
 * than guessing the new state optimistically.
 */
export function useDecideAdminAiRequest() {
  const queryClient = useQueryClient();

  return useMutation<AdminAiRequestDTO, unknown, DecideAdminAiRequestVariables>({
    mutationFn: ({ requestId, ...payload }) => decideAdminAiRequest(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.aiRequests() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
