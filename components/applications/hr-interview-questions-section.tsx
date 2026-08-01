import { CopyButton } from "@/components/ui/copy-button";
import type { HrInterviewQuestionSet } from "@/lib/hr-interview-questions";

type HrInterviewQuestionsSectionProps = {
  questions: HrInterviewQuestionSet | null;
};

export function HrInterviewQuestionsSection({ questions }: HrInterviewQuestionsSectionProps) {
  if (!questions) {
    return null;
  }

  const coreQuestions = questions.questions.filter((question) => question.category === "CORE");
  const vacancyQuestions = questions.questions.filter(
    (question) => question.category === "VACANCY_SPECIFIC",
  );

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
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          HR interview questions
        </h3>
        <CopyButton text={allQuestionsText} label="Copy all questions" />
      </div>
      <div className="flex flex-col gap-4">
        {coreQuestions.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium">Common questions</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
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
            <p className="mb-1.5 text-sm font-medium">For this vacancy</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {vacancyQuestions.map((question) => (
                <li key={question.text} className="break-words">
                  {question.text}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
