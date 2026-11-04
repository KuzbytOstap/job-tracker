"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ProfileDTO, UpdateProfilePayload } from "@/lib/api-types";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<ProfileDTO, unknown, UpdateProfilePayload>({
    mutationFn: (payload) => updateProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile.detail(), data);
    },
  });
}
