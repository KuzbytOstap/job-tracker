import { Prisma, Status } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildHrInterviewQuestionSet,
  createCoreOnlyQuestionSet,
  type HrInterviewQuestionSet,
} from "@/lib/hr-interview-questions";
import { getHrQuestionsProvider } from "@/lib/ai/get-hr-questions-provider";
import { HrQuestionsProviderError } from "@/lib/ai/hr-questions-provider";

export type HrQuestionsTransitionContext = {
  company: string;
  position: string;
  platform: string;
  salaryExpectation: string | null;
  notes: string | null;
  jobPostingText: string | null;
  coverLetterText: string | null;
};

export type HrQuestionsTransitionResult = {
  hrInterviewQuestions: HrInterviewQuestionSet;
  hrQuestionsGeneratedAt: Date;
};

function hasMeaningfulContext(context: HrQuestionsTransitionContext): boolean {
  return [context.notes, context.jobPostingText, context.coverLetterText].some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

/**
 * Detects and handles the first transition of an application into HR Call:
 * persists the deterministic core question set immediately, then — outside
 * any database transaction — optionally asks the AI provider for a handful
 * of vacancy-specific questions and merges them in. Never throws: a failed
 * or skipped enhancement still leaves the core question set in place, so the
 * caller's status-update response is always successful.
 */
export async function maybeGenerateHrQuestionsOnTransition(params: {
  applicationId: string;
  previousStatus: Status;
  newStatus: Status;
  existingHrInterviewQuestions: Prisma.JsonValue | null;
  context: HrQuestionsTransitionContext;
}): Promise<HrQuestionsTransitionResult | null> {
  const { applicationId, previousStatus, newStatus, existingHrInterviewQuestions, context } = params;

  if (newStatus !== Status.HR_CALL || previousStatus === Status.HR_CALL) {
    return null;
  }

  if (existingHrInterviewQuestions !== null) {
    return null;
  }

  const claimedAt = new Date();
  const coreOnly = createCoreOnlyQuestionSet();

  // Atomic claim: only the request that actually flips hrInterviewQuestions
  // from database-NULL to a value gets to proceed. Concurrent/duplicate
  // transitions for the same application lose this race and no-op. The
  // status transition itself already committed before this ever runs, so a
  // failure here must never surface as a failed status update — it's
  // reported as "no HR questions this time" rather than thrown.
  let claim: { count: number };
  try {
    claim = await prisma.jobApplication.updateMany({
      where: { id: applicationId, hrInterviewQuestions: { equals: Prisma.DbNull } },
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

  if (!hasMeaningfulContext(context)) {
    return { hrInterviewQuestions: coreOnly, hrQuestionsGeneratedAt: claimedAt };
  }

  let additionalQuestions: string[];
  try {
    const provider = getHrQuestionsProvider();
    const result = await provider.generateAdditionalQuestions({
      company: context.company,
      position: context.position,
      platform: context.platform,
      salaryExpectation: context.salaryExpectation,
      notes: context.notes,
      jobPostingText: context.jobPostingText,
      coverLetterText: context.coverLetterText,
    });
    additionalQuestions = result.additionalQuestions;
    console.info("[hr-questions] provider enhancement succeeded", { applicationId, provider: provider.name });
  } catch (error) {
    const kind = error instanceof HrQuestionsProviderError ? error.kind : "unknown";
    console.error("[hr-questions] provider enhancement failed", { applicationId, kind });
    return { hrInterviewQuestions: coreOnly, hrQuestionsGeneratedAt: claimedAt };
  }

  if (additionalQuestions.length === 0) {
    return { hrInterviewQuestions: coreOnly, hrQuestionsGeneratedAt: claimedAt };
  }

  const merged = buildHrInterviewQuestionSet(additionalQuestions);
  const mergedAt = new Date();

  try {
    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        hrInterviewQuestions: merged as unknown as Prisma.InputJsonValue,
        hrQuestionsGeneratedAt: mergedAt,
      },
    });
  } catch {
    console.error("[hr-questions] failed to persist enhanced questions", { applicationId });
    return { hrInterviewQuestions: coreOnly, hrQuestionsGeneratedAt: claimedAt };
  }

  return { hrInterviewQuestions: merged, hrQuestionsGeneratedAt: mergedAt };
}
