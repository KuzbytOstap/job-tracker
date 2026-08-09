import { AiAccessStatus, AiRequestStatus, AiRequestType, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AiAccessRequestErrorCode = "NOT_ELIGIBLE";

export class AiAccessRequestError extends Error {
  readonly code: AiAccessRequestErrorCode;

  constructor(code: AiAccessRequestErrorCode, message: string) {
    super(message);
    this.name = "AiAccessRequestError";
    this.code = code;
  }
}

export function aiAccessRequestErrorStatus(_code: AiAccessRequestErrorCode): number {
  return 409;
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
