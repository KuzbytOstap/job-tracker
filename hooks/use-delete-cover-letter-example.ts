"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCoverLetterExample } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useDeleteCoverLetterExample() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: (id) => deleteCoverLetterExample(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.examples() });
    },
  });
}
