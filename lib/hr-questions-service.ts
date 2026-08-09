import { randomUUID } from "node:crypto";
import { AiFeature, Prisma, Status } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildHrInterviewQuestionSet,
  createCoreOnlyQuestionSet,
  hasVacancySpecificQuestions,
  parseStoredHrInterviewQuestionSet,
  type HrInterviewQuestionSet,
} from "@/lib/hr-interview-questions";
import { getHrQuestionsProvider } from "@/lib/ai/get-hr-questions-provider";
import { HrQuestionsProviderError, type HrQuestionsGenerationResult } from "@/lib/ai/hr-questions-provider";
import { AiAccessError, requireAiAccessApproved, runGatedAiCall } from "@/lib/ai/access-control";

export type HrQuestionsTransitionContext = {
  company: string;
  position: string;
  platform: string;
  salaryExpectation: string | null;
  notes: string | null;
  jobPostingText: string | null;
  coverLetterText: string | null;
};

export type HrQuestionsResult = {
  hrInterviewQuestions: HrInterviewQuestionSet;
  hrQuestionsGeneratedAt: Date;
};

function hasMeaningfulContext(context: HrQuestionsTransitionContext): boolean {
  return [context.notes, context.jobPostingText, context.coverLetterText].some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

// Defense in depth: the provider's own Structured Output schema already
// enforces this length, but a mock or future provider could still hand back
// something out of bounds. Reject outright rather than silently truncating
// or splitting a compound question.
const MAX_ADDITIONAL_QUESTION_LENGTH = 140;

function sanitizeAdditionalQuestions(questions: readonly string[]): string[] {
  return questions
    .map((question) => question.trim())
    .filter((question) => question.length > 0 && question.length <= MAX_ADDITIONAL_QUESTION_LENGTH);
}

// A lease, not a permanent lock: staleness lets a fresh request recover the
// slot if the previous holder crashed before ever releasing it. Comfortably
// above the 30s OpenAI request timeout, short enough to recover quickly.
const HR_ENHANCEMENT_LEASE_TTL_MS = 2 * 60 * 1000;

// Release is scoped by the exact lease token the caller was issued, not just
// applicationId. Without that, a slow/crashed holder's release could arrive
// after a newer request has already reclaimed the (by-then stale) lease and
// clear that newer claim out from under it. Scoping by token makes a stale
// release a safe no-op instead.
async function releaseHrEnhancementClaim(applicationId: string, leaseToken: string): Promise<void> {
  try {
    await prisma.jobApplication.updateMany({
      where: { id: applicationId, hrEnhancementClaimToken: leaseToken },
      data: { hrEnhancementClaimedAt: null, hrEnhancementClaimToken: null },
    });
  } catch {
    console.error("[hr-questions] failed to release enhancement claim", { applicationId });
  }
}

export function isFirstHrCallTransition(
  previousStatus: Status,
  newStatus: Status,
  existingHrInterviewQuestions: Prisma.JsonValue | null,
): boolean {
  return (
    newStatus === Status.HR_CALL &&
    previousStatus !== Status.HR_CALL &&
    existingHrInterviewQuestions === null
  );
}

/**
 * Fast, AI-free step run inline with a status update: on the first transition
 * into HR Call it atomically claims and persists the deterministic core
 * question set. The claim (`hrInterviewQuestions` NULL → value) makes
 * concurrent/duplicate transitions no-op, so this is idempotent. It never
 * throws — a failure just reports "no questions", leaving the already-saved
 * status change untouched. The slower vacancy-specific enhancement is done
 * separately by {@link generateVacancySpecificHrQuestions}.
 */
export async function ensureCoreHrQuestionsForTransition(params: {
  applicationId: string;
  userId: string;
  previousStatus: Status;
  newStatus: Status;
  existingHrInterviewQuestions: Prisma.JsonValue | null;
}): Promise<HrQuestionsResult | null> {
  const { applicationId, userId, previousStatus, newStatus, existingHrInterviewQuestions } = params;

  if (!isFirstHrCallTransition(previousStatus, newStatus, existingHrInterviewQuestions)) {
    return null;
  }

  const claimedAt = new Date();
  const coreOnly = createCoreOnlyQuestionSet();

  let claim: { count: number };
  try {
    claim = await prisma.jobApplication.updateMany({
      where: { id: applicationId, userId, hrInterviewQuestions: { equals: Prisma.DbNull } },
      data: {
        hrInterviewQuestions: coreOnly as unknown as Prisma.InputJsonValue,
        hrQuestionsGeneratedAt: claimedAt,
      },
    });
  } catch {
    console.error("[hr-questions] failed to claim/store core questions", { applicationId });
    return null;
  }

  if (claim.count === 0) {
    return null;
  }

  console.info("[hr-questions] core questions stored", { applicationId });
  return { hrInterviewQuestions: coreOnly, hrQuestionsGeneratedAt: claimedAt };
}

/**
 * Slower, best-effort enhancement run as a separate follow-up request (never
 * inline with a status update, so the AI request timeout can't delay it).
 * Loads the application, and if it already has a core-only question set and
 * meaningful vacancy context, asks the AI provider for a few vacancy-specific
 * questions and merges them in. Idempotent: a set that already contains
 * vacancy-specific questions is returned unchanged without calling the
 * provider, and merging always rebuilds a deduplicated set. Provider
 * failures are swallowed and return the current stored set (the core
 * questions stay AI-free either way) — but an {@link AiAccessError} is
 * deliberately not swallowed: it propagates so the route can surface a
 * structured access/quota error instead of silently pretending nothing was
 * blocked.
 */
export async function generateVacancySpecificHrQuestions(
  applicationId: string,
  userId: string,
): Promise<HrQuestionsResult | null> {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, userId },
  });
  if (!application) {
    return null;
  }

  const current = parseStoredHrInterviewQuestionSet(application.hrInterviewQuestions);
  if (!current) {
    // Core questions haven't been claimed yet (not an HR_CALL application):
    // nothing to enhance.
    return null;
  }

  const generatedAt = application.hrQuestionsGeneratedAt ?? new Date();

  if (hasVacancySpecificQuestions(current)) {
    return { hrInterviewQuestions: current, hrQuestionsGeneratedAt: generatedAt };
  }

  const context: HrQuestionsTransitionContext = {
    company: application.company,
    position: application.position,
    platform: application.platform,
    salaryExpectation: application.salaryExpectation,
    notes: application.notes,
    jobPostingText: application.jobPostingText,
    coverLetterText: application.coverLetterText,
  };

  if (!hasMeaningfulContext(context)) {
    return { hrInterviewQuestions: current, hrQuestionsGeneratedAt: generatedAt };
  }

  // Atomic lease claim, same idiom as the core-question claim above: only the
  // caller that wins the guarded UPDATE gets the right to call the AI
  // provider. A concurrent duplicate loses the race here and returns the
  // current set unchanged, closing the double-billing window between the
  // read above and the AI call below. The OR branch recovers a lease whose
  // holder crashed without releasing it, without needing the exact prior
  // token — recovery only needs to know the lease is stale, not who held it.
  const leaseToken = randomUUID();
  const staleBefore = new Date(Date.now() - HR_ENHANCEMENT_LEASE_TTL_MS);

  let claim: { count: number };
  try {
    claim = await prisma.jobApplication.updateMany({
      where: {
        id: applicationId,
        userId,
        OR: [{ hrEnhancementClaimToken: null }, { hrEnhancementClaimedAt: { lt: staleBefore } }],
      },
      data: { hrEnhancementClaimedAt: new Date(), hrEnhancementClaimToken: leaseToken },
    });
  } catch {
    console.error("[hr-questions] failed to claim enhancement slot", { applicationId });
    return { hrInterviewQuestions: current, hrQuestionsGeneratedAt: generatedAt };
  }

  if (claim.count === 0) {
    return { hrInterviewQuestions: current, hrQuestionsGeneratedAt: generatedAt };
  }

  let additionalQuestions: string[];
  try {
    const provider = getHrQuestionsProvider();

    let result: HrQuestionsGenerationResult;
    if (provider.name === "mock") {
      await requireAiAccessApproved(userId);
      result = await provider.generateAdditionalQuestions(context);
    } else {
      result = await runGatedAiCall({
        userId,
        feature: AiFeature.HR_GENERATION,
        applicationId,
        maxOutputTokens: provider.maxOutputTokens,
        countInputTokens: () => provider.countInputTokens(context),
        call: (reportUsage) => provider.generateAdditionalQuestions(context, { onUsage: reportUsage }),
      });
    }

    additionalQuestions = sanitizeAdditionalQuestions(result.additionalQuestions);
    console.info("[hr-questions] provider enhancement succeeded", {
      applicationId,
      provider: provider.name,
    });
  } catch (error) {
    if (error instanceof AiAccessError) {
      await releaseHrEnhancementClaim(applicationId, leaseToken);
      throw error;
    }

    const kind = error instanceof HrQuestionsProviderError ? error.kind : "unknown";
    console.error("[hr-questions] provider enhancement failed", { applicationId, kind });
    await releaseHrEnhancementClaim(applicationId, leaseToken);
    return { hrInterviewQuestions: current, hrQuestionsGeneratedAt: generatedAt };
  }

  if (additionalQuestions.length === 0) {
    return { hrInterviewQuestions: current, hrQuestionsGeneratedAt: generatedAt };
  }

  const merged = buildHrInterviewQuestionSet(additionalQuestions);
  const mergedAt = new Date();

  let persisted: { count: number };
  try {
    persisted = await prisma.jobApplication.updateMany({
      where: { id: applicationId, userId },
      data: {
        hrInterviewQuestions: merged as unknown as Prisma.InputJsonValue,
        hrQuestionsGeneratedAt: mergedAt,
      },
    });
  } catch {
    console.error("[hr-questions] failed to persist enhanced questions", { applicationId });
    return { hrInterviewQuestions: current, hrQuestionsGeneratedAt: generatedAt };
  }

  if (persisted.count === 0) {
    console.error("[hr-questions] application vanished before persisting enhanced questions", {
      applicationId,
    });
    return { hrInterviewQuestions: current, hrQuestionsGeneratedAt: generatedAt };
  }

  return { hrInterviewQuestions: merged, hrQuestionsGeneratedAt: mergedAt };
}
