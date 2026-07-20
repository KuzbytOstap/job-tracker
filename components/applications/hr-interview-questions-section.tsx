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

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        HR interview questions
      </h3>
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
