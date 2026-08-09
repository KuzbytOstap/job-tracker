"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DecisionNoteDialog } from "@/components/admin/requests/decision-note-dialog";
import { formatRelativeDate } from "@/lib/relative-date";
import type { AdminAiRequestDTO } from "@/lib/api-types";

type AiAccessRequestCardProps = {
  request: AdminAiRequestDTO;
};

export function AiAccessRequestCard({ request }: AiAccessRequestCardProps) {
  const [pendingDecision, setPendingDecision] = useState<"APPROVED" | "REJECTED" | null>(null);

  return (
    <div className="gh-list-skeleton-card flex flex-col gap-3 rounded-xl border border-l-[3px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--gh-text)]">
          {request.user.name ?? request.user.email ?? "Unknown user"}
        </p>
        <p className="truncate text-xs text-[var(--gh-text-muted)]">
          {request.user.email} · requested {formatRelativeDate(request.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setPendingDecision("REJECTED")}>
          <X data-icon="inline-start" />
          Reject
        </Button>
        <Button type="button" size="sm" onClick={() => setPendingDecision("APPROVED")}>
          <Check data-icon="inline-start" />
          Approve
        </Button>
      </div>
      {pendingDecision && (
        <DecisionNoteDialog
          request={request}
          decision={pendingDecision}
          open
          onOpenChange={(open) => !open && setPendingDecision(null)}
        />
      )}
    </div>
  );
}
