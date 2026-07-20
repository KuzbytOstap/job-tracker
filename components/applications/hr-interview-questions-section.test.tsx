// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HrInterviewQuestionsSection } from "@/components/applications/hr-interview-questions-section";
import type { HrInterviewQuestionSet } from "@/lib/hr-interview-questions";

afterEach(() => {
  cleanup();
});

const coreOnly: HrInterviewQuestionSet = {
  version: 1,
  questions: [
    { text: "Tell me about yourself.", category: "CORE" },
    { text: "Why are you interested in this role?", category: "CORE" },
  ],
};

const withVacancySpecific: HrInterviewQuestionSet = {
  version: 1,
  questions: [
    ...coreOnly.questions,
    { text: "What is your Node.js experience?", category: "VACANCY_SPECIFIC" },
    { text: "Are you comfortable with the required time zone?", category: "VACANCY_SPECIFIC" },
  ],
};

describe("HrInterviewQuestionsSection", () => {
  it("renders nothing when the question set is null", () => {
    const { container } = render(<HrInterviewQuestionsSection questions={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the section heading and common questions in order when questions exist", () => {
    render(<HrInterviewQuestionsSection questions={coreOnly} />);

    expect(screen.getByText("HR interview questions")).toBeInTheDocument();
    expect(screen.getByText("Common questions")).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Tell me about yourself.",
      "Why are you interested in this role?",
    ]);
  });

  it("does not render the vacancy-specific group for a core-only result", () => {
    render(<HrInterviewQuestionsSection questions={coreOnly} />);
    expect(screen.queryByText("For this vacancy")).not.toBeInTheDocument();
  });

  it("renders the vacancy-specific group only when at least one such question exists", () => {
    render(<HrInterviewQuestionsSection questions={withVacancySpecific} />);

    expect(screen.getByText("For this vacancy")).toBeInTheDocument();
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
  });

  it("renders question strings as plain text, never as HTML or Markdown", () => {
    const htmlLikeText = "<script>alert('x')</script>\n**bold**";
    const set: HrInterviewQuestionSet = {
      version: 1,
      questions: [{ text: htmlLikeText, category: "CORE" }],
    };

    const { container } = render(<HrInterviewQuestionsSection questions={set} />);

    const item = container.querySelector("li");
    expect(item?.textContent).toBe(htmlLikeText);
    expect(container.querySelector("script")).not.toBeInTheDocument();
  });
});
