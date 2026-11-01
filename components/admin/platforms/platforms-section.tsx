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
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { formatRelativeDate } from "@/lib/relative-date";
import { useT } from "@/components/i18n/i18n-provider";
import { Platform } from "@/app/generated/prisma/enums";
import type { AdminPlatformProposalDTO } from "@/lib/api-types";

function ownersLabel(proposal: AdminPlatformProposalDTO, unknownUser: string): string {
  return proposal.owners.map((owner) => owner.name ?? owner.email ?? unknownUser).join(", ");
}

function PlatformProposalCard({ proposal }: { proposal: AdminPlatformProposalDTO }) {
  const t = useT();
  const mutation = useDecideAdminPlatformProposal();

  function decide(decision: "APPROVED" | "REJECTED") {
    if (mutation.isPending) return;

    mutation.mutate(
      { proposalId: proposal.id, decision },
      {
        onSuccess: () =>
          toast.success(
            decision === "APPROVED"
              ? t("admin.platforms.madePublic", { name: proposal.name })
              : t("admin.platforms.stayedPrivate", { name: proposal.name }),
          ),
        onError: (error) =>
          toast.error(getApiErrorMessage(t, error, "admin.requests.toasts.decisionFailed")),
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
            {t("nav.applicationsCount", { count: proposal.applicationCount })}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--gh-text-muted)]">
          {t("admin.platforms.addedBy", {
            owners: ownersLabel(proposal, t("admin.requests.unknownUser")),
            when: formatRelativeDate(proposal.createdAt, new Date(), t),
          })}
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
          {t("admin.platforms.keepPrivate")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending}
          aria-busy={mutation.isPending}
          onClick={() => decide("APPROVED")}
        >
          <Check data-icon="inline-start" />
          {t("admin.platforms.addForEveryone")}
        </Button>
      </div>
    </div>
  );
}

export function PlatformsSection() {
  const t = useT();
  const query = useAdminPlatformProposals();

  if (query.isPending) {
    return <AdminSkeletonList rows={3} />;
  }

  if (query.isError) {
    return <AdminErrorState message={t("admin.platforms.loadFailed")} onRetry={() => query.refetch()} />;
  }

  const proposals = query.data.proposals;

  return (
    <section className="flex flex-col gap-3">
      <AdminSectionHeading>{t("admin.platforms.heading")}</AdminSectionHeading>
      {proposals.length === 0 ? (
        <AdminEmptyState icon={Globe} title={t("admin.platforms.empty")} />
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
