import { z } from "zod";
import { AiAccessStatus, Status } from "@/app/generated/prisma/enums";

// Deterministic core questions asked for every HR Call. Order is
// intentional: it's the order shown to the user and the order the AI is
// told not to duplicate, so don't reorder without checking both.
export const HR_CORE_QUESTIONS: readonly string[] = [
  "Tell me about yourself.",
  "Why are you interested in this role?",
  "Why do you want to work at this company?",
  "Why are you looking for a new opportunity?",
  "What are your strengths and weaknesses?",
  "Tell me about a challenging project you worked on.",
  "How do you handle unclear requirements?",
  "How do you work when you are blocked?",
  "How do you collaborate with backend developers, QA engineers, designers, and project managers?",
  "What are your salary expectations?",
  "When can you start?",
  "What is your English level?",
  "Why should we choose you?",
];

export const HR_QUESTION_CATEGORY_VALUES = ["CORE", "VACANCY_SPECIFIC"] as const;

const MAX_QUESTION_LENGTH = 300;
const MAX_TOTAL_QUESTIONS = 25;

const hrInterviewQuestionSchema = z
  .object({
    text: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
    category: z.enum(HR_QUESTION_CATEGORY_VALUES),
  })
  .strict();

export type HrInterviewQuestion = z.infer<typeof hrInterviewQuestionSchema>;

export const hrInterviewQuestionSetSchema = z
  .object({
    version: z.literal(1),
    questions: z.array(hrInterviewQuestionSchema).max(MAX_TOTAL_QUESTIONS),
  })
  .strict();

export type HrInterviewQuestionSet = z.infer<typeof hrInterviewQuestionSetSchema>;

// Dedupe key ignores case and trailing punctuation only, so "Why do you..."
// and "why do you...?" collapse but distinct questions never do.
function dedupeKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?…,;:]+$/u, "")
    .trim();
}

type UnnormalizedQuestion = { text: string; category: HrInterviewQuestion["category"] };

export function normalizeAndDedupeQuestions(
  questions: readonly UnnormalizedQuestion[],
): HrInterviewQuestion[] {
  const seen = new Set<string>();
  const result: HrInterviewQuestion[] = [];

  for (const question of questions) {
    const text = question.text.trim();
    if (text.length === 0 || text.length > MAX_QUESTION_LENGTH) continue;

    const key = dedupeKey(text);
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({ text, category: question.category });
    if (result.length >= MAX_TOTAL_QUESTIONS) break;
  }

  return result;
}

export function createCoreOnlyQuestionSet(): HrInterviewQuestionSet {
  const questions = normalizeAndDedupeQuestions(
    HR_CORE_QUESTIONS.map((text) => ({ text, category: "CORE" as const })),
  );
  return { version: 1, questions };
}

export function buildHrInterviewQuestionSet(additionalQuestionTexts: readonly string[]): HrInterviewQuestionSet {
  const core: UnnormalizedQuestion[] = HR_CORE_QUESTIONS.map((text) => ({ text, category: "CORE" }));
  const additional: UnnormalizedQuestion[] = additionalQuestionTexts.map((text) => ({
    text,
    category: "VACANCY_SPECIFIC",
  }));

  return { version: 1, questions: normalizeAndDedupeQuestions([...core, ...additional]) };
}

export function hasVacancySpecificQuestions(set: HrInterviewQuestionSet | null): boolean {
  return set !== null && set.questions.some((question) => question.category === "VACANCY_SPECIFIC");
}

/**
 * Client-side gate for the automatic vacancy-specific HR question follow-up
 * fired right after a status change into HR_CALL. This is purely an
 * optimization to skip a call the server would reject anyway — the server's
 * own access check (`requireAiAccessApproved` / `runGatedAiCall`) stays the
 * source of truth. `aiAccessStatus` is treated as "ok to attempt" when it
 * hasn't loaded yet (`null`/`undefined`) so a slow status fetch never
 * silently drops the enhancement for an already-approved user.
 */
export function shouldAutoGenerateHrQuestions(params: {
  status: Status;
  hrInterviewQuestions: HrInterviewQuestionSet | null;
  aiAccessStatus: AiAccessStatus | null | undefined;
}): boolean {
  return (
    params.status === Status.HR_CALL &&
    !hasVacancySpecificQuestions(params.hrInterviewQuestions) &&
    (params.aiAccessStatus == null || params.aiAccessStatus === AiAccessStatus.APPROVED)
  );
}

export function parseStoredHrInterviewQuestionSet(value: unknown): HrInterviewQuestionSet | null {
  if (value === null || value === undefined) return null;
  const result = hrInterviewQuestionSetSchema.safeParse(value);
  return result.success ? result.data : null;
}
