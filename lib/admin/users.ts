import { AiAccessStatus, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { utcDateOnly } from "@/lib/ai/access-control";
import type { AdminUserDTO } from "@/lib/api-types";

export type AdminUserErrorCode = "NOT_FOUND" | "INVALID_TRANSITION";

export class AdminUserError extends Error {
  readonly code: AdminUserErrorCode;

  constructor(code: AdminUserErrorCode, message: string) {
    super(message);
    this.name = "AdminUserError";
    this.code = code;
  }
}

export function adminUserErrorStatus(code: AdminUserErrorCode): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "INVALID_TRANSITION":
      return 409;
  }
}

/**
 * Lists every user with their role, AI access status, today's UTC-day
 * vacancy/HR/token usage, effective limits (global default, or the
 * permanent per-user override when set, plus today's bonus), and the raw
 * override values themselves. Mirrors the same limit-precedence
 * `loadEffectiveLimitsAndUsage` in `lib/ai/access-control.ts` uses for a
 * single user, computed here in one batched query instead of N+1 lookups.
 */
export async function listAdminUsers(): Promise<AdminUserDTO[]> {
  const today = utcDateOnly(new Date());

  const [users, globalLimits] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        aiAccessStatus: true,
        aiUserLimit: {
          select: { vacancyGenerationLimit: true, hrGenerationLimit: true, tokenLimit: true },
        },
        aiUsageDaily: {
          where: { date: today },
          select: {
            vacancyGenerationCount: true,
            hrGenerationCount: true,
            tokenCount: true,
            vacancyGenerationBonus: true,
            hrGenerationBonus: true,
            tokenBonus: true,
          },
        },
      },
      orderBy: { email: "asc" },
    }),
    prisma.aiGlobalLimits.upsert({ where: { id: 1 }, create: {}, update: {} }),
  ]);

  return users.map((user) => {
    const daily = user.aiUsageDaily[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      aiAccessStatus: user.aiAccessStatus,
      usage: {
        vacancy: daily?.vacancyGenerationCount ?? 0,
        hr: daily?.hrGenerationCount ?? 0,
        tokens: daily?.tokenCount ?? 0,
      },
      limits: {
        vacancy:
          (user.aiUserLimit?.vacancyGenerationLimit ?? globalLimits.vacancyGenerationLimit) +
          (daily?.vacancyGenerationBonus ?? 0),
        hr: (user.aiUserLimit?.hrGenerationLimit ?? globalLimits.hrGenerationLimit) + (daily?.hrGenerationBonus ?? 0),
        tokens: (user.aiUserLimit?.tokenLimit ?? globalLimits.tokenLimit) + (daily?.tokenBonus ?? 0),
      },
      overrides: {
        vacancy: user.aiUserLimit?.vacancyGenerationLimit ?? null,
        hr: user.aiUserLimit?.hrGenerationLimit ?? null,
        tokens: user.aiUserLimit?.tokenLimit ?? null,
      },
    };
  });
}

async function assertUserExists(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new AdminUserError("NOT_FOUND", "User not found.");
  }
}

/**
 * Suspends an APPROVED user's AI access. The guarded `updateMany` (`WHERE
 * aiAccessStatus = APPROVED`) is the atomic transition check: it only
 * succeeds from APPROVED, so it can't be used to "suspend" a user who was
 * never approved or is already suspended. On a miss, a follow-up existence
 * check distinguishes NOT_FOUND from an invalid current state purely for
 * error messaging — it has no bearing on the transition itself.
 */
export async function suspendAiAccess(userId: string): Promise<AiAccessStatus> {
  const updated = await prisma.user.updateMany({
    where: { id: userId, aiAccessStatus: AiAccessStatus.APPROVED },
    data: { aiAccessStatus: AiAccessStatus.SUSPENDED },
  });

  if (updated.count === 0) {
    await assertUserExists(userId);
    throw new AdminUserError("INVALID_TRANSITION", "Only a user with APPROVED AI access can be suspended.");
  }

  return AiAccessStatus.SUSPENDED;
}

/**
 * Restores a SUSPENDED user's AI access back to APPROVED. Same guarded
 * `updateMany` idiom as {@link suspendAiAccess}, gated on the opposite
 * starting state.
 */
export async function restoreAiAccess(userId: string): Promise<AiAccessStatus> {
  const updated = await prisma.user.updateMany({
    where: { id: userId, aiAccessStatus: AiAccessStatus.SUSPENDED },
    data: { aiAccessStatus: AiAccessStatus.APPROVED },
  });

  if (updated.count === 0) {
    await assertUserExists(userId);
    throw new AdminUserError("INVALID_TRANSITION", "Only a SUSPENDED user's AI access can be restored.");
  }

  return AiAccessStatus.APPROVED;
}

export type AiUserLimitOverridesInput = {
  vacancyGenerationLimit?: number | null;
  hrGenerationLimit?: number | null;
  tokenLimit?: number | null;
};

/**
 * Sets or clears permanent per-user limit overrides. A field set to a
 * number pins that limit; a field explicitly set to `null` removes the
 * override (falling back to the global default again); an omitted field is
 * left untouched. Upserts the `AiUserLimit` row directly rather than
 * pre-checking user existence — a foreign-key violation on `create` (no
 * such user) is mapped to `NOT_FOUND`, avoiding a separate racy lookup.
 */
export async function setAiUserLimitOverrides(
  userId: string,
  overrides: AiUserLimitOverridesInput,
): Promise<{ vacancy: number | null; hr: number | null; tokens: number | null }> {
  const updateData: Prisma.AiUserLimitUpdateInput = {};
  if ("vacancyGenerationLimit" in overrides) updateData.vacancyGenerationLimit = overrides.vacancyGenerationLimit;
  if ("hrGenerationLimit" in overrides) updateData.hrGenerationLimit = overrides.hrGenerationLimit;
  if ("tokenLimit" in overrides) updateData.tokenLimit = overrides.tokenLimit;

  try {
    const result = await prisma.aiUserLimit.upsert({
      where: { userId },
      create: {
        userId,
        vacancyGenerationLimit: overrides.vacancyGenerationLimit ?? null,
        hrGenerationLimit: overrides.hrGenerationLimit ?? null,
        tokenLimit: overrides.tokenLimit ?? null,
      },
      update: updateData,
    });

    return {
      vacancy: result.vacancyGenerationLimit,
      hr: result.hrGenerationLimit,
      tokens: result.tokenLimit,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new AdminUserError("NOT_FOUND", "User not found.");
    }
    throw error;
  }
}
