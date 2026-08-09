import { AiAccessStatus, AiRequestStatus, AiRequestType, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiUsageStatus, utcDateOnly } from "@/lib/ai/access-control";

export type AiAccessRequestErrorCode = "NOT_ELIGIBLE" | "QUOTA_NOT_EXHAUSTED";

export class AiAccessRequestError extends Error {
  readonly code: AiAccessRequestErrorCode;

  constructor(code: AiAccessRequestErrorCode, message: string) {
    super(message);
    this.name = "AiAccessRequestError";
    this.code = code;
  }
}

export const AI_USAGE_REQUEST_TYPES = [
  AiRequestType.VACANCY_LIMIT,
  AiRequestType.HR_LIMIT,
  AiRequestType.TOKEN_LIMIT,
] as const;

export type AiUsageRequestType = (typeof AI_USAGE_REQUEST_TYPES)[number];

const USAGE_QUOTA_FIELD: Record<AiUsageRequestType, "vacancy" | "hr" | "tokens"> = {
  VACANCY_LIMIT: "vacancy",
  HR_LIMIT: "hr",
  TOKEN_LIMIT: "tokens",
};

export function aiAccessRequestErrorStatus(code: AiAccessRequestErrorCode): number {
  switch (code) {
    case "NOT_ELIGIBLE":
    case "QUOTA_NOT_EXHAUSTED":
      return 409;
  }
}

export async function getAiAccessStatus(userId: string): Promise<AiAccessStatus> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiAccessStatus: true } });
  return user?.aiAccessStatus ?? AiAccessStatus.NOT_REQUESTED;
}

/**
 * Atomically moves a NOT_REQUESTED user to PENDING and creates the AI_ACCESS
 * request row in one transaction. The guarded `updateMany` (`WHERE
 * aiAccessStatus = NOT_REQUESTED`) is the real concurrency guard: concurrent
 * calls for the same user serialize through Postgres' row lock on the user
 * row, so only the first ever flips the status and creates the request —
 * every other caller (including APPROVED/REJECTED/PENDING/SUSPENDED users)
 * matches zero rows and is rejected. The DB's partial unique index on
 * (userId, type) WHERE status = 'PENDING' is the backstop for the request
 * row itself; a violation there is mapped to the same NOT_ELIGIBLE error.
 */
export async function requestAiAccess(userId: string): Promise<AiAccessStatus> {
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: userId, aiAccessStatus: AiAccessStatus.NOT_REQUESTED },
        data: { aiAccessStatus: AiAccessStatus.PENDING },
      });

      if (updated.count === 0) {
        throw new AiAccessRequestError(
          "NOT_ELIGIBLE",
          "AI access has already been requested or decided for this account.",
        );
      }

      await tx.aiAccessRequest.create({
        data: { userId, type: AiRequestType.AI_ACCESS, status: AiRequestStatus.PENDING },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AiAccessRequestError(
        "NOT_ELIGIBLE",
        "AI access has already been requested or decided for this account.",
      );
    }
    throw error;
  }

  return AiAccessStatus.PENDING;
}

/**
 * Creates a request-more-usage record for one already-exhausted daily
 * quota, tagged with today's UTC quota day (`quotaDate`). Only an APPROVED
 * user can call this — `getAiUsageStatus` itself delegates to
 * `requireAiAccessApproved`, so `AI_ACCESS_REQUIRED`/`AI_SUSPENDED` surface
 * the same way a real AI call would reject them — and only when that exact
 * quota is currently exhausted, checked via the same usage snapshot the
 * status UI reads, so eligibility can never drift from what the user is
 * shown. This never grants a bonus itself; that stays an admin-only
 * decision made later, and that future decision must be scoped to this same
 * `quotaDate` rather than assumed to mean "today". The DB's partial unique
 * index on (userId, type, quotaDate) WHERE status = 'PENDING' is the
 * concurrency backstop against a duplicate pending request of the same type
 * *for the same quota day* — a pending request left over from a previous
 * UTC day (never decided) does not collide with it, so it can never block a
 * new request for today's exhaustion. A `P2002` violation on the insert is
 * mapped to `NOT_ELIGIBLE`, mirroring `requestAiAccess`.
 */
export async function requestMoreAiUsage(
  userId: string,
  type: AiUsageRequestType,
): Promise<typeof AiRequestStatus.PENDING> {
  const usage = await getAiUsageStatus(userId);
  if (!usage[USAGE_QUOTA_FIELD[type]].exhausted) {
    throw new AiAccessRequestError("QUOTA_NOT_EXHAUSTED", "This quota isn't exhausted yet.");
  }

  const quotaDate = utcDateOnly(new Date());
  try {
    await prisma.aiAccessRequest.create({
      data: { userId, type, status: AiRequestStatus.PENDING, quotaDate },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AiAccessRequestError("NOT_ELIGIBLE", "A request for this quota is already pending.");
    }
    throw error;
  }

  return AiRequestStatus.PENDING;
}

/**
 * The subset of the user's pending requests that concern a specific usage
 * quota (as opposed to AI_ACCESS itself) for today's UTC quota day, used to
 * render a persisted pending state after a page reload. Scoped to today's
 * `quotaDate` so a stale, never-decided pending request from a previous UTC
 * day is not mistaken for an already-pending request against today's
 * exhausted quota.
 */
export async function getPendingUsageRequestTypes(userId: string): Promise<AiUsageRequestType[]> {
  const quotaDate = utcDateOnly(new Date());
  const rows = await prisma.aiAccessRequest.findMany({
    where: {
      userId,
      status: AiRequestStatus.PENDING,
      type: { in: [...AI_USAGE_REQUEST_TYPES] },
      quotaDate,
    },
    select: { type: true },
  });
  return rows.map((row) => row.type as AiUsageRequestType);
}
