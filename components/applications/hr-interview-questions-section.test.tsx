// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HrInterviewQuestionsSection } from "@/components/applications/hr-interview-questions-section";
import type { HrInterviewQuestionSet } from "@/lib/hr-interview-questions";
import type { AiAccessStatus } from "@/app/generated/prisma/enums";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  requestAiAccess: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

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

function renderSection(questions: HrInterviewQuestionSet | null, aiAccessStatus: AiAccessStatus | undefined) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <HrInterviewQuestionsSection questions={questions} aiAccessStatus={aiAccessStatus} />
    </QueryClientProvider>,
  );
}

describe("HrInterviewQuestionsSection", () => {
  it("renders nothing when the question set is null", () => {
    const { container } = renderSection(null, "APPROVED");
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the section heading and common questions in order when questions exist", () => {
    renderSection(coreOnly, "APPROVED");

    expect(screen.getByText("HR interview questions")).toBeInTheDocument();
    expect(screen.getByText("Common questions")).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Tell me about yourself.",
      "Why are you interested in this role?",
    ]);
  });

  it("does not render the vacancy-specific group for a core-only result", () => {
    renderSection(coreOnly, "APPROVED");
    expect(screen.queryByText("For this vacancy")).not.toBeInTheDocument();
  });

  it("renders the vacancy-specific group only when at least one such question exists", () => {
    renderSection(withVacancySpecific, "APPROVED");

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

    const { container } = renderSection(set, "APPROVED");

    const item = container.querySelector("li");
    expect(item?.textContent).toBe(htmlLikeText);
    expect(container.querySelector("script")).not.toBeInTheDocument();
  });

  it("shows no AI access notice for APPROVED users missing vacancy-specific questions", () => {
    renderSection(coreOnly, "APPROVED");
    expect(screen.queryByText(/AI access|AI features/)).not.toBeInTheDocument();
  });

  it("shows no AI access notice for REJECTED users (AI entry points stay hidden)", () => {
    renderSection(coreOnly, "REJECTED");
    expect(screen.queryByText(/AI access|AI features/)).not.toBeInTheDocument();
  });

  it("shows the locked notice with a Request AI access action for NOT_REQUESTED", () => {
    renderSection(coreOnly, "NOT_REQUESTED");
    expect(screen.getByText("AI features are locked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request AI access" })).toBeInTheDocument();
  });

  it("shows the pending notice for PENDING", () => {
    renderSection(coreOnly, "PENDING");
    expect(screen.getByText("AI access request pending")).toBeInTheDocument();
  });

  it("shows the suspended notice for SUSPENDED", () => {
    renderSection(coreOnly, "SUSPENDED");
    expect(screen.getByText("AI access is suspended")).toBeInTheDocument();
  });

  it("does not show a locked notice once vacancy-specific questions already exist", () => {
    renderSection(withVacancySpecific, "PENDING");
    expect(screen.queryByText("AI access request pending")).not.toBeInTheDocument();
  });

  it("does not show a locked notice while the AI access status hasn't loaded yet", () => {
    renderSection(coreOnly, undefined);
    expect(screen.queryByText(/AI access|AI features/)).not.toBeInTheDocument();
  });
});
