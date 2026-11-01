"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decideAdminPlatformProposal } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

type DecideAdminPlatformProposalVariables = {
  proposalId: string;
  decision: "APPROVED" | "REJECTED";
};

export function useDecideAdminPlatformProposal() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, unknown, DecideAdminPlatformProposalVariables>({
    mutationFn: ({ proposalId, decision }) => decideAdminPlatformProposal(proposalId, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformProposals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms() });
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.root() });
    },
  });
}
