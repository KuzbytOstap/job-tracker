"use client";

import { Check, Globe, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminSectionHeading,
  AdminSkeletonList,
} from "@/components/admin/admin-state";
import { useAdminPlatformProposals } from "@/hooks/use-admin-platform-proposals";
import { useDecideAdminPlatformProposal } from "@/hooks/use-decide-admin-platform-proposal";
import { ApiError } from "@/lib/api";
import { formatRelativeDate } from "@/lib/relative-date";
import { Platform } from "@/app/generated/prisma/enums";
import type { AdminPlatformProposalDTO } from "@/lib/api-types";

function ownersLabel(proposal: AdminPlatformProposalDTO): string {
  return proposal.owners.map((owner) => owner.name ?? owner.email ?? "Unknown user").join(", ");
}

function PlatformProposalCard({ proposal }: { proposal: AdminPlatformProposalDTO }) {
  const mutation = useDecideAdminPlatformProposal();

  function decide(decision: "APPROVED" | "REJECTED") {
    if (mutation.isPending) return;

    mutation.mutate(
      { proposalId: proposal.id, decision },
      {
        onSuccess: () =>
          toast.success(
            decision === "APPROVED"
              ? `${proposal.name} is now available to everyone`
              : `${proposal.name} stays private to its users`,
          ),
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Couldn't save the decision. Try again."),
      },
    );
  }

  return (
    <div className="gh-list-skeleton-card flex flex-col gap-3 rounded-xl border border-l-[3px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <PlatformBadge
            platform={Platform.OTHER}
            customPlatform={{ id: proposal.id, name: proposal.name, colorKey: proposal.colorKey }}
          />
          <span className="text-xs text-[var(--gh-text-muted)]">
            {proposal.applicationCount} application{proposal.applicationCount === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--gh-text-muted)]">
          Added by {ownersLabel(proposal)} · {formatRelativeDate(proposal.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => decide("REJECTED")}
        >
          <X data-icon="inline-start" />
          Keep private
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending}
          aria-busy={mutation.isPending}
          onClick={() => decide("APPROVED")}
        >
          <Check data-icon="inline-start" />
          Add for everyone
        </Button>
      </div>
    </div>
  );
}

export function PlatformsSection() {
  const query = useAdminPlatformProposals();

  if (query.isPending) {
    return <AdminSkeletonList rows={3} />;
  }

  if (query.isError) {
    return <AdminErrorState message="We couldn't load platform proposals." onRetry={() => query.refetch()} />;
  }

  const proposals = query.data.proposals;

  return (
    <section className="flex flex-col gap-3">
      <AdminSectionHeading>Platforms added by users</AdminSectionHeading>
      {proposals.length === 0 ? (
        <AdminEmptyState icon={Globe} title="No platforms waiting for review" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {proposals.map((proposal) => (
            <PlatformProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </section>
  );
}
