"use client";

import { Inbox, ShieldQuestion } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminSectionHeading, AdminSkeletonList } from "@/components/admin/admin-state";
import { AiAccessRequestCard } from "@/components/admin/requests/ai-access-request-card";
import { UsageRequestCard } from "@/components/admin/requests/usage-request-card";
import { RequestHistoryItem } from "@/components/admin/requests/request-history-item";
import { useAdminAiRequests } from "@/hooks/use-admin-ai-requests";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { AiRequestStatus, AiRequestType } from "@/app/generated/prisma/enums";
import { isUsageRequestType } from "@/lib/admin-labels";
import { useT } from "@/components/i18n/i18n-provider";
import type { AdminAiRequestDTO } from "@/lib/api-types";

const HISTORY_LIMIT = 20;

function sortByDecidedAtDesc(a: AdminAiRequestDTO, b: AdminAiRequestDTO): number {
  const aTime = a.decidedAt ? new Date(a.decidedAt).getTime() : new Date(a.updatedAt).getTime();
  const bTime = b.decidedAt ? new Date(b.decidedAt).getTime() : new Date(b.updatedAt).getTime();
  return bTime - aTime;
}

export function RequestsSection() {
  const t = useT();
  const requestsQuery = useAdminAiRequests();
  const usersQuery = useAdminUsers();

  if (requestsQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <AdminSkeletonList rows={2} />
        <AdminSkeletonList rows={2} />
        <AdminSkeletonList rows={3} />
      </div>
    );
  }

  if (requestsQuery.isError) {
    return <AdminErrorState message={t("admin.requests.loadFailed")} onRetry={() => requestsQuery.refetch()} />;
  }

  const requests = requestsQuery.data.requests;
  const usersById = new Map((usersQuery.data?.users ?? []).map((user) => [user.id, user]));

  const pendingAiAccess = requests.filter(
    (request) => request.type === AiRequestType.AI_ACCESS && request.status === AiRequestStatus.PENDING,
  );
  const pendingUsage = requests.filter(
    (request) => isUsageRequestType(request.type) && request.status === AiRequestStatus.PENDING,
  );
  const history = requests
    .filter((request) => request.status !== AiRequestStatus.PENDING)
    .sort(sortByDecidedAtDesc)
    .slice(0, HISTORY_LIMIT);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <AdminSectionHeading>{t("admin.requests.pendingAccess")}</AdminSectionHeading>
        {pendingAiAccess.length === 0 ? (
          <AdminEmptyState icon={ShieldQuestion} title={t("admin.requests.noPendingAccess")} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {pendingAiAccess.map((request) => (
              <AiAccessRequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <AdminSectionHeading>{t("admin.requests.pendingUsage")}</AdminSectionHeading>
        {pendingUsage.length === 0 ? (
          <AdminEmptyState icon={ShieldQuestion} title={t("admin.requests.noPendingUsage")} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {pendingUsage.map((request) => (
              <UsageRequestCard key={request.id} request={request} user={usersById.get(request.user.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <AdminSectionHeading>{t("admin.requests.history")}</AdminSectionHeading>
        {history.length === 0 ? (
          <AdminEmptyState icon={Inbox} title={t("admin.requests.noHistory")} />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((request) => (
              <RequestHistoryItem key={request.id} request={request} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
