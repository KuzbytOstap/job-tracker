import { AiAccessStatus, AiFeature, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AiUsageReport } from "@/lib/ai/token-usage";

export type AiAccessErrorCode =
  | "AI_ACCESS_REQUIRED"
  | "AI_SUSPENDED"
  | "VACANCY_LIMIT_REACHED"
  | "HR_LIMIT_REACHED"
  | "TOKEN_LIMIT_REACHED";

export class AiAccessError extends Error {
  readonly code: AiAccessErrorCode;

  constructor(code: AiAccessErrorCode, message: string) {
    super(message);
    this.name = "AiAccessError";
    this.code = code;
  }
}

export function aiAccessErrorStatus(code: AiAccessErrorCode): number {
  switch (code) {
    case "AI_ACCESS_REQUIRED":
    case "AI_SUSPENDED":
      return 403;
    case "VACANCY_LIMIT_REACHED":
    case "HR_LIMIT_REACHED":
    case "TOKEN_LIMIT_REACHED":
      return 429;
  }
}

export type AiQuotaReservation = {
  userId: string;
  feature: AiFeature;
  date: Date;
  reservedTokens: number;
};

function utcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function requireAiAccessApproved(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiAccessStatus: true } });
  const status = user?.aiAccessStatus ?? AiAccessStatus.NOT_REQUESTED;

  if (status === AiAccessStatus.SUSPENDED) {
    throw new AiAccessError("AI_SUSPENDED", "AI access has been suspended.");
  }
  if (status !== AiAccessStatus.APPROVED) {
    throw new AiAccessError("AI_ACCESS_REQUIRED", "AI access has not been approved yet.");
  }
}

async function loadEffectiveLimits(
  userId: string,
  date: Date,
): Promise<{ vacancyLimit: number; hrLimit: number; tokenLimit: number }> {
  const [globalLimits, userLimit, daily] = await Promise.all([
    prisma.aiGlobalLimits.upsert({ where: { id: 1 }, create: {}, update: {} }),
    prisma.aiUserLimit.findUnique({ where: { userId } }),
    prisma.aiUsageDaily.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date },
      update: {},
    }),
  ]);

  return {
    vacancyLimit:
      (userLimit?.vacancyGenerationLimit ?? globalLimits.vacancyGenerationLimit) + daily.vacancyGenerationBonus,
    hrLimit: (userLimit?.hrGenerationLimit ?? globalLimits.hrGenerationLimit) + daily.hrGenerationBonus,
    tokenLimit: (userLimit?.tokenLimit ?? globalLimits.tokenLimit) + daily.tokenBonus,
  };
}

async function throwSpecificReservationError(
  userId: string,
  date: Date,
  feature: AiFeature,
  featureLimit: number,
): Promise<never> {
  const current = await prisma.aiUsageDaily.findUnique({ where: { userId_date: { userId, date } } });
  const currentCount =
    feature === AiFeature.VACANCY_GENERATION
      ? (current?.vacancyGenerationCount ?? 0)
      : (current?.hrGenerationCount ?? 0);

  if (currentCount >= featureLimit) {
    throw new AiAccessError(
      feature === AiFeature.VACANCY_GENERATION ? "VACANCY_LIMIT_REACHED" : "HR_LIMIT_REACHED",
      feature === AiFeature.VACANCY_GENERATION
        ? "Daily vacancy generation limit reached."
        : "Daily HR question generation limit reached.",
    );
  }

  throw new AiAccessError("TOKEN_LIMIT_REACHED", "Daily AI token limit reached.");
}

/**
 * Atomically claims quota for one AI call before the provider is invoked.
 * The guarded UPDATE (`WHERE count < limit AND tokenCount <= limit -
 * estimate`) is a single statement, so concurrent reservations for the same
 * user/day serialize through Postgres' row lock and can never jointly
 * overshoot either limit — the same atomic-claim idiom already used for the
 * core HR question set.
 */
export async function reserveAiQuota(params: {
  userId: string;
  feature: AiFeature;
  estimatedTokens: number;
}): Promise<AiQuotaReservation> {
  const { userId, feature, estimatedTokens } = params;

  await requireAiAccessApproved(userId);

  const date = utcDateOnly(new Date());
  const { vacancyLimit, hrLimit, tokenLimit } = await loadEffectiveLimits(userId, date);

  if (feature === AiFeature.VACANCY_GENERATION) {
    const reserved = await prisma.aiUsageDaily.updateMany({
      where: {
        userId,
        date,
        vacancyGenerationCount: { lt: vacancyLimit },
        tokenCount: { lte: tokenLimit - estimatedTokens },
      },
      data: {
        vacancyGenerationCount: { increment: 1 },
        tokenCount: { increment: estimatedTokens },
      },
    });

    if (reserved.count === 0) {
      await throwSpecificReservationError(userId, date, feature, vacancyLimit);
    }
  } else {
    const reserved = await prisma.aiUsageDaily.updateMany({
      where: {
        userId,
        date,
        hrGenerationCount: { lt: hrLimit },
        tokenCount: { lte: tokenLimit - estimatedTokens },
      },
      data: {
        hrGenerationCount: { increment: 1 },
        tokenCount: { increment: estimatedTokens },
      },
    });

    if (reserved.count === 0) {
      await throwSpecificReservationError(userId, date, feature, hrLimit);
    }
  }

  return { userId, feature, date, reservedTokens: estimatedTokens };
}

export async function rollbackAiReservation(reservation: AiQuotaReservation): Promise<void> {
  const { userId, date, feature, reservedTokens } = reservation;

  if (feature === AiFeature.VACANCY_GENERATION) {
    await prisma.aiUsageDaily.update({
      where: { userId_date: { userId, date } },
      data: { vacancyGenerationCount: { decrement: 1 }, tokenCount: { decrement: reservedTokens } },
    });
  } else {
    await prisma.aiUsageDaily.update({
      where: { userId_date: { userId, date } },
      data: { hrGenerationCount: { decrement: 1 }, tokenCount: { decrement: reservedTokens } },
    });
  }
}

export async function finalizeAiUsage(params: {
  reservation: AiQuotaReservation;
  applicationId?: string | null;
  usage: AiUsageReport;
}): Promise<void> {
  const { reservation, applicationId, usage } = params;
  const delta = usage.totalTokens - reservation.reservedTokens;

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  if (delta !== 0) {
    operations.push(
      prisma.aiUsageDaily.update({
        where: { userId_date: { userId: reservation.userId, date: reservation.date } },
        data: { tokenCount: { increment: delta } },
      }),
    );
  }
  operations.push(
    prisma.aiUsageEvent.create({
      data: {
        userId: reservation.userId,
        applicationId: applicationId ?? null,
        feature: reservation.feature,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      },
    }),
  );

  await prisma.$transaction(operations);
}

/**
 * Wraps one real AI provider call with count-then-reserve-before-call /
 * finalize-or-rollback-after-call semantics.
 *
 * `countInputTokens` must report the exact input-token count OpenAI would
 * charge for the very request `call` is about to send (built from the same
 * request-construction code, not a re-derived approximation of it) — the
 * reservation is `exactInputTokens + maxOutputTokens`, a real hard ceiling
 * on total usage rather than a guess, since `max_output_tokens` is enforced
 * server-side by the provider. Counting runs before any reservation or
 * provider call is made, so a counting failure blocks both and never
 * consumes quota.
 *
 * `call` receives a `reportUsage` callback the provider must invoke with the
 * actual token usage before resolving; if it never does, usage is finalized
 * as zero rather than guessed.
 *
 * Rollback only ever undoes a reservation for a call that never happened
 * (the provider itself threw). Once the provider call has succeeded, the
 * real-world cost has already occurred, so a failure to finalize usage
 * afterward is logged and swallowed rather than rolled back — quota stays
 * consumed (fail closed) instead of being refunded for a call that did run.
 */
export async function runGatedAiCall<T>(params: {
  userId: string;
  feature: AiFeature;
  applicationId?: string | null;
  maxOutputTokens: number;
  countInputTokens: () => Promise<number>;
  call: (reportUsage: (usage: AiUsageReport) => void) => Promise<T>;
}): Promise<T> {
  const exactInputTokens = await params.countInputTokens();

  const reservation = await reserveAiQuota({
    userId: params.userId,
    feature: params.feature,
    estimatedTokens: exactInputTokens + params.maxOutputTokens,
  });

  let usage: AiUsageReport | null = null;
  let result: T;
  try {
    result = await params.call((report) => {
      usage = report;
    });
  } catch (error) {
    await rollbackAiReservation(reservation);
    throw error;
  }

  try {
    await finalizeAiUsage({
      reservation,
      applicationId: params.applicationId,
      usage: usage ?? { model: "unknown", inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
  } catch (finalizeError) {
    console.error("[ai-access-control] failed to finalize AI usage after a successful call; quota stays consumed", {
      userId: reservation.userId,
      feature: reservation.feature,
      error: finalizeError,
    });
  }

  return result;
}
