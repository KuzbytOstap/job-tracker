import { AiAccessStatus, AiRequestStatus, AiRequestType, type AiAccessRequest } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { utcDateOnly } from "@/lib/ai/access-control";
import type { AiUsageRequestType } from "@/lib/ai/access-requests";
import type { AdminAiRequestDTO, AdminUserRef } from "@/lib/api-types";

export type AdminAiRequestErrorCode = "NOT_FOUND" | "ALREADY_DECIDED" | "STALE_REQUEST" | "INVALID_GRANT_AMOUNT";

export class AdminAiRequestError extends Error {
  readonly code: AdminAiRequestErrorCode;

  constructor(code: AdminAiRequestErrorCode, message: string) {
    super(message);
    this.name = "AdminAiRequestError";
    this.code = code;
  }
}

export function adminAiRequestErrorStatus(code: AdminAiRequestErrorCode): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "ALREADY_DECIDED":
    case "STALE_REQUEST":
    case "INVALID_GRANT_AMOUNT":
      return 409;
  }
}

function usageBonusWriteData(type: AiUsageRequestType, userId: string, date: Date, amount: number) {
  switch (type) {
    case "VACANCY_LIMIT":
      return {
        create: { userId, date, vacancyGenerationBonus: amount },
        update: { vacancyGenerationBonus: { increment: amount } },
      };
    case "HR_LIMIT":
      return {
        create: { userId, date, hrGenerationBonus: amount },
        update: { hrGenerationBonus: { increment: amount } },
      };
    case "TOKEN_LIMIT":
      return {
        create: { userId, date, tokenBonus: amount },
        update: { tokenBonus: { increment: amount } },
      };
  }
}

type RequestWithRelations = AiAccessRequest & {
  user: AdminUserRef;
  decidedByUser: AdminUserRef | null;
};

function toAdminAiRequestDTO(row: RequestWithRelations): AdminAiRequestDTO {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    quotaDate: row.quotaDate ? row.quotaDate.toISOString() : null,
    message: row.message,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    decisionNote: row.decisionNote,
    grantedAmount: row.grantedAmount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: row.user,
    decidedByUser: row.decidedByUser,
  };
}

const REQUEST_RELATIONS_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  decidedByUser: { select: { id: true, name: true, email: true } },
} as const;

async function getAiRequestDTOOrThrow(id: string): Promise<AdminAiRequestDTO> {
  const row = await prisma.aiAccessRequest.findUniqueOrThrow({
    where: { id },
    include: REQUEST_RELATIONS_INCLUDE,
  });
  return toAdminAiRequestDTO(row);
}

/**
 * Lists AI access/usage requests for the admin queue, most relevant first:
 * PENDING requests sort before decided ones (native Postgres enum order
 * matches the PENDING/APPROVED/REJECTED declaration order), then newest
 * first within each status.
 */
export async function listAiRequests(filter?: {
  status?: AiRequestStatus;
  type?: AiRequestType;
}): Promise<AdminAiRequestDTO[]> {
  const rows = await prisma.aiAccessRequest.findMany({
    where: {
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.type ? { type: filter.type } : {}),
    },
    include: REQUEST_RELATIONS_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toAdminAiRequestDTO);
}

export type DecideAiRequestParams = {
  requestId: string;
  adminUserId: string;
  decision: "APPROVED" | "REJECTED";
  decisionNote?: string | null;
  grantedAmount?: number | null;
};

/**
 * Decides one pending request, dispatching on its type. Only a currently
 * PENDING request can be decided; a concurrent decision on the same request
 * loses the guarded update below and gets `ALREADY_DECIDED` instead of
 * silently double-applying its effect.
 */
export async function decideAiRequest(params: DecideAiRequestParams): Promise<AdminAiRequestDTO> {
  const request = await prisma.aiAccessRequest.findUnique({
    where: { id: params.requestId },
    select: { id: true, userId: true, type: true, status: true, quotaDate: true },
  });

  if (!request) {
    throw new AdminAiRequestError("NOT_FOUND", "AI request not found.");
  }

  if (request.type === AiRequestType.AI_ACCESS) {
    return decideAiAccessRequest(request, params);
  }

  return decideAiUsageRequest({ ...request, type: request.type as AiUsageRequestType }, params);
}

/**
 * AI_ACCESS decision: flips the request status and the user's
 * `aiAccessStatus` together. The guarded `updateMany` (`WHERE status =
 * PENDING AND type = AI_ACCESS`) is the atomic gate — only the transaction
 * that wins the row lock and observes PENDING actually applies the user
 * status change; a second, concurrent decision on the same request matches
 * zero rows and throws before touching the user row.
 */
async function decideAiAccessRequest(
  request: { id: string; userId: string; type: AiRequestType; status: AiRequestStatus },
  params: DecideAiRequestParams,
): Promise<AdminAiRequestDTO> {
  const newRequestStatus = params.decision === "APPROVED" ? AiRequestStatus.APPROVED : AiRequestStatus.REJECTED;
  const newAccessStatus = params.decision === "APPROVED" ? AiAccessStatus.APPROVED : AiAccessStatus.REJECTED;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.aiAccessRequest.updateMany({
      where: { id: request.id, status: AiRequestStatus.PENDING, type: AiRequestType.AI_ACCESS },
      data: {
        status: newRequestStatus,
        decidedAt: new Date(),
        decidedByUserId: params.adminUserId,
        decisionNote: params.decisionNote ?? null,
      },
    });

    if (updated.count === 0) {
      throw new AdminAiRequestError("ALREADY_DECIDED", "This request has already been decided.");
    }

    await tx.user.update({
      where: { id: request.userId },
      data: { aiAccessStatus: newAccessStatus },
    });
  });

  return getAiRequestDTOOrThrow(request.id);
}

/**
 * Usage-limit (VACANCY_LIMIT/HR_LIMIT/TOKEN_LIMIT) decision. A request is
 * only decidable while it is still PENDING. Rejection is always allowed
 * once PENDING, even for a request left over from a previous UTC quota
 * day — it only ever flips the request's own status/decision fields and
 * never touches `AiUsageDaily`, so there's no bonus to grant incorrectly.
 * Approval is stricter: it additionally requires `quotaDate` to be today's
 * UTC quota day, since it grants a bonus *for that day* — a stale request
 * can never be approved (`STALE_REQUEST`), so it can never grant a bonus
 * for a day that has already passed. Approval and the `AiUsageDaily` bonus
 * increment happen in the same guarded transaction as the request's status
 * flip, so a concurrent double-approval can never double-grant: the loser's
 * `updateMany` matches zero rows (status is no longer PENDING) and throws
 * before the bonus upsert runs.
 */
async function decideAiUsageRequest(
  request: { id: string; userId: string; type: AiUsageRequestType; status: AiRequestStatus; quotaDate: Date | null },
  params: DecideAiRequestParams,
): Promise<AdminAiRequestDTO> {
  if (request.status !== AiRequestStatus.PENDING) {
    throw new AdminAiRequestError("ALREADY_DECIDED", "This request has already been decided.");
  }

  if (params.decision === "REJECTED") {
    const updated = await prisma.aiAccessRequest.updateMany({
      where: { id: request.id, status: AiRequestStatus.PENDING },
      data: {
        status: AiRequestStatus.REJECTED,
        decidedAt: new Date(),
        decidedByUserId: params.adminUserId,
        decisionNote: params.decisionNote ?? null,
      },
    });

    if (updated.count === 0) {
      throw new AdminAiRequestError("ALREADY_DECIDED", "This request has already been decided.");
    }

    return getAiRequestDTOOrThrow(request.id);
  }

  const today = utcDateOnly(new Date());
  if (!request.quotaDate || request.quotaDate.getTime() !== today.getTime()) {
    throw new AdminAiRequestError(
      "STALE_REQUEST",
      "This request is for a past quota day and can no longer be decided.",
    );
  }

  const grantedAmount = params.grantedAmount;
  if (
    grantedAmount === null ||
    grantedAmount === undefined ||
    !Number.isInteger(grantedAmount) ||
    grantedAmount <= 0
  ) {
    throw new AdminAiRequestError("INVALID_GRANT_AMOUNT", "grantedAmount must be a positive integer.");
  }

  const bonusData = usageBonusWriteData(request.type, request.userId, today, grantedAmount);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.aiAccessRequest.updateMany({
      where: { id: request.id, status: AiRequestStatus.PENDING, quotaDate: today },
      data: {
        status: AiRequestStatus.APPROVED,
        decidedAt: new Date(),
        decidedByUserId: params.adminUserId,
        decisionNote: params.decisionNote ?? null,
        grantedAmount,
      },
    });

    if (updated.count === 0) {
      throw new AdminAiRequestError("ALREADY_DECIDED", "This request has already been decided.");
    }

    await tx.aiUsageDaily.upsert({
      where: { userId_date: { userId: request.userId, date: today } },
      create: bonusData.create,
      update: bonusData.update,
    });
  });

  return getAiRequestDTOOrThrow(request.id);
}
