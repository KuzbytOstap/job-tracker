import { CopyButton } from "@/components/ui/copy-button";
import { AiAccessNotice, type LockedAiAccessStatus } from "@/components/ai/ai-access-notice";
import { AiQuotaNotice } from "@/components/ai/ai-quota-notice";
import { hasVacancySpecificQuestions, type HrInterviewQuestionSet } from "@/lib/hr-interview-questions";
import { resolveAiQuotaReason, quotaForReason } from "@/lib/ai-quota";
import { AiAccessStatus } from "@/app/generated/prisma/enums";
import type { AiUsageStatusResponse } from "@/lib/api-types";

type HrInterviewQuestionsSectionProps = {
  questions: HrInterviewQuestionSet | null;
  aiAccessStatus: AiAccessStatus | undefined;
  aiUsage?: AiUsageStatusResponse;
};

export function HrInterviewQuestionsSection({ questions, aiAccessStatus, aiUsage }: HrInterviewQuestionsSectionProps) {
  if (!questions) {
    return null;
  }

  const coreQuestions = questions.questions.filter((question) => question.category === "CORE");
  const vacancyQuestions = questions.questions.filter(
    (question) => question.category === "VACANCY_SPECIFIC",
  );
  const missingVacancyQuestions = !hasVacancySpecificQuestions(questions);

  // Only the two-sided "waiting on AI" states get an explanatory notice —
  // REJECTED hides AI entry points entirely (silently, like elsewhere), and
  // APPROVED users who still lack vacancy-specific questions are covered by
  // the automatic HR_CALL follow-up (and, if a quota is exhausted, the
  // quota notice below), not this notice.
  const lockedAiAccessStatus: LockedAiAccessStatus | null =
    missingVacancyQuestions &&
    (aiAccessStatus === AiAccessStatus.NOT_REQUESTED ||
      aiAccessStatus === AiAccessStatus.PENDING ||
      aiAccessStatus === AiAccessStatus.SUSPENDED)
      ? aiAccessStatus
      : null;

  // Same idea for an APPROVED user whose HR-generation or shared token quota
  // is exhausted: the automatic follow-up already ran (or will) and was
  // rejected server-side, so explain why vacancy-specific questions are
  // still missing instead of leaving it unexplained.
  const quotaReason =
    aiAccessStatus === AiAccessStatus.APPROVED && missingVacancyQuestions
      ? resolveAiQuotaReason(aiUsage, "HR_GENERATION")
      : null;

  const allQuestionsText = [
    coreQuestions.length > 0 && "Common questions",
    ...coreQuestions.map((question) => question.text),
    vacancyQuestions.length > 0 && "For this vacancy",
    ...vacancyQuestions.map((question) => question.text),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-[var(--gh-text-muted,var(--muted-foreground))] uppercase">
          HR interview questions
        </h3>
        <CopyButton text={allQuestionsText} label="Copy all questions" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--gh-border,var(--border))] bg-[var(--gh-surface-secondary,var(--muted))]/60 p-3">
        {coreQuestions.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-[var(--gh-text-secondary,var(--muted-foreground))] uppercase">
              Common questions
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--gh-text,var(--foreground))]">
              {coreQuestions.map((question) => (
                <li key={question.text} className="break-words">
                  {question.text}
                </li>
              ))}
            </ol>
          </div>
        )}

        {vacancyQuestions.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-[var(--gh-text-secondary,var(--muted-foreground))] uppercase">
              For this vacancy
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--gh-text,var(--foreground))]">
              {vacancyQuestions.map((question) => (
                <li key={question.text} className="break-words">
                  {question.text}
                </li>
              ))}
            </ol>
          </div>
        )}

        {lockedAiAccessStatus && <AiAccessNotice status={lockedAiAccessStatus} />}
        {quotaReason && aiUsage && (
          <AiQuotaNotice reason={quotaReason} quota={quotaForReason(aiUsage, quotaReason)} resetAt={aiUsage.resetAt} />
        )}
      </div>
    </div>
  );
}
