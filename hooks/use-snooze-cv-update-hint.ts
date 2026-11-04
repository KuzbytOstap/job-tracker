"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { snoozeCvUpdateHint } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CvUpdateHintDTO } from "@/lib/api-types";

export function useSnoozeCvUpdateHint() {
  const queryClient = useQueryClient();

  return useMutation<CvUpdateHintDTO, unknown, void>({
    mutationFn: () => snoozeCvUpdateHint(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile.cvUpdateHint(), data);
    },
  });
}
