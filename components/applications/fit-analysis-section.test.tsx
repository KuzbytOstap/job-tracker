// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FitAnalysisSection } from "@/components/applications/fit-analysis-section";
import { ApiError } from "@/lib/api";
import { AiAccessStatus, Status } from "@/app/generated/prisma/enums";
import type { AiUsageStatusResponse, ApplicationDTO, FitAnalysisDTO } from "@/lib/api-types";

const state = vi.hoisted(() => ({
  analyze: vi.fn(),
  pending: false,
  runningElsewhere: false,
  error: null as unknown,
  data: undefined as unknown,
}));

vi.mock("@/hooks/use-analyze-application-fit", () => ({
  useAnalyzeApplicationFit: () => ({
    mutate: state.analyze,
    isPending: state.pending,
    isError: state.error !== null,
    error: state.error,
    isSuccess: state.data !== undefined,
    data: state.data,
  }),
  useIsAnalyzingApplicationFit: () => state.runningElsewhere,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const analysis: FitAnalysisDTO = {
  analyzedAt: "2026-11-03T10:00:00.000Z",
  items: [
    {
      criterion: "SALARY",
      verdict: "MISMATCH",
      vacancyValue: "2000 USD per month",
      yourValue: "3500 USD per month",
      reason: "The offer is below your minimum.",
    },
    {
      criterion: "WORK_FORMAT",
      verdict: "MATCH",
      vacancyValue: "Remote",
      yourValue: "Remote",
      reason: "Both sides want remote work.",
    },
    {
      criterion: "EMPLOYMENT_TYPE",
      verdict: "UNKNOWN",
      vacancyValue: null,
      yourValue: "Full time",
      reason: "The vacancy does not mention the employment type.",
    },
    {
      criterion: "EXPERIENCE_YEARS",
      verdict: "MATCH",
      vacancyValue: "3+ years",
      yourValue: null,
      reason: "Your CV shows about 5 years.",
    },
    {
      criterion: "TECHNOLOGIES",
      verdict: "MISMATCH",
      vacancyValue: "Go, Kubernetes",
      yourValue: "TypeScript, React",
      reason: "<b>Go</b> is required and your CV does not mention it.",
    },
  ],
};

function application(overrides: Partial<ApplicationDTO> = {}): ApplicationDTO {
  return {
    id: "app-1",
    company: "Acme",
    position: "Engineer",
    platform: "DIRECT",
    link: null,
    status: Status.APPLIED,
    hasTestTask: false,
    testTaskDone: false,
    salaryExpectation: null,
    notes: null,
    jobPostingText: "We need an engineer",
    sourceUrls: [],
    coverLetterText: null,
    hrCallTranscript: null,
    appliedAt: "2026-11-01T00:00:00.000Z",
    lastActivityAt: "2026-11-01T00:00:00.000Z",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    effectiveStatus: Status.APPLIED,
    isAutoIgnored: false,
    statusChanges: [],
    hrInterviewQuestions: null,
    hrQuestionsGeneratedAt: null,
    ...overrides,
  } as ApplicationDTO;
}

function usage(fitAnalysis: Partial<AiUsageStatusResponse["fitAnalysis"]> = {}): AiUsageStatusResponse {
  return {
    resetAt: "2026-11-04T00:00:00.000Z",
    vacancy: { used: 0, limit: 10, exhausted: false, pendingRequest: false },
    hr: { used: 0, limit: 10, exhausted: false, pendingRequest: false },
    profile: { used: 0, limit: 50, exhausted: false, pendingRequest: false },
    coverLetter: { used: 0, limit: 20, exhausted: false, pendingRequest: false },
    fitAnalysis: { used: 3, limit: 30, exhausted: false, pendingRequest: false, ...fitAnalysis },
    tokens: { used: 0, limit: 20_000, exhausted: false, pendingRequest: false },
  };
}

function renderSection(
  app: ApplicationDTO = application(),
  aiAccessStatus: AiAccessStatus | undefined = AiAccessStatus.APPROVED,
  aiUsage: AiUsageStatusResponse | undefined = usage(),
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FitAnalysisSection application={app} aiAccessStatus={aiAccessStatus} aiUsage={aiUsage} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  state.analyze.mockReset();
  state.pending = false;
  state.runningElsewhere = false;
  state.error = null;
  state.data = undefined;
});

afterEach(() => {
  cleanup();
});

describe("FitAnalysisSection before the first analysis", () => {
  it("shows the empty state and analyzes the application by id", async () => {
    const user = userEvent.setup();
    renderSection();

    expect(screen.getByRole("heading", { name: "Vacancy fit" })).toBeInTheDocument();
    expect(screen.getByText("Not analyzed yet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(state.analyze).toHaveBeenCalledTimes(1);
    expect(state.analyze.mock.calls[0][0]).toBe("app-1");
  });

  it("keeps the analyze button disabled with a reason while there is no job posting text", () => {
    renderSection(application({ jobPostingText: "   " }));

    const button = screen.getByRole("button", { name: "Analyze" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("Add the job posting text to analyze the fit.");
  });

  it("shows how much of the daily analysis limit is used", () => {
    renderSection();

    expect(
      screen.getByText("Each analysis uses one of your daily analyses (3 / 30 used today)."),
    ).toBeInTheDocument();
  });
});

describe("FitAnalysisSection with a stored analysis", () => {
  it("lists the five criteria in the stored order with a verdict word for each", () => {
    renderSection(application({ fitAnalysis: analysis }));

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.map((item) => within(item).getByText(/^(Match|Mismatch|Unknown)$/).textContent)).toEqual([
      "Mismatch",
      "Match",
      "Unknown",
      "Match",
      "Mismatch",
    ]);
    expect(within(items[0]).getByText("Salary")).toBeInTheDocument();
    expect(within(items[1]).getByText("Work format")).toBeInTheDocument();
    expect(within(items[2]).getByText("Employment type")).toBeInTheDocument();
    expect(within(items[3]).getByText("Years of experience")).toBeInTheDocument();
    expect(within(items[4]).getByText("Technologies")).toBeInTheDocument();
  });

  it("shows what the vacancy says against what you have, with fallbacks for missing values", () => {
    renderSection(application({ fitAnalysis: analysis }));

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(within(items[0]).getByText("2000 USD per month")).toBeInTheDocument();
    expect(within(items[0]).getByText("3500 USD per month")).toBeInTheDocument();
    expect(within(items[2]).getByText("Not specified")).toBeInTheDocument();
    expect(within(items[3]).getByText("No data")).toBeInTheDocument();
  });

  it("summarizes the mismatch count and offers a refresh", () => {
    renderSection(application({ fitAnalysis: analysis }));

    expect(screen.getByText("2 mismatches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
    expect(screen.queryByText("Not analyzed yet")).not.toBeInTheDocument();
  });

  it("says all criteria match only when every criterion was confirmed", () => {
    const allMatch: FitAnalysisDTO = {
      ...analysis,
      items: analysis.items.map((item) => ({ ...item, verdict: "MATCH" })),
    };
    renderSection(application({ fitAnalysis: allMatch }));

    expect(screen.getByText("All criteria match")).toBeInTheDocument();
  });

  it("never reads as a good fit when criteria could not be checked", () => {
    const partial: FitAnalysisDTO = {
      ...analysis,
      items: analysis.items.map((item, index) => ({ ...item, verdict: index < 2 ? "MATCH" : "UNKNOWN" })),
    };
    renderSection(application({ fitAnalysis: partial }));

    expect(screen.getByText("No mismatches, but 3 of 5 criteria could not be checked")).toBeInTheDocument();
    expect(screen.queryByText("All criteria match")).not.toBeInTheDocument();
  });

  it("announces a finished analysis to screen readers", () => {
    state.data = { status: "ok" };
    renderSection(application({ fitAnalysis: analysis }));

    const announcement = screen.getByText("Analysis updated. 2 mismatches");
    expect(announcement).toHaveClass("sr-only");
    expect(announcement.closest("[aria-live='polite']")).not.toBeNull();
  });

  it("renders reasons as plain text", () => {
    const { container } = renderSection(application({ fitAnalysis: analysis }));

    expect(screen.getByText("<b>Go</b> is required and your CV does not mention it.")).toBeInTheDocument();
    expect(container.querySelector("b")).not.toBeInTheDocument();
  });

  it("shows the busy state while the analysis runs", () => {
    state.pending = true;
    renderSection(application({ fitAnalysis: analysis }));

    const button = screen.getByRole("button", { name: "Analyzing…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("blocks a second run while an analysis started elsewhere is still running", async () => {
    const user = userEvent.setup();
    state.runningElsewhere = true;
    renderSection();

    const button = screen.getByRole("button", { name: "Analyzing…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button", { name: "Analyze" })).not.toBeInTheDocument();

    await user.click(button);

    expect(state.analyze).not.toHaveBeenCalled();
  });
});

describe("FitAnalysisSection outcomes", () => {
  it("explains a missing CV text and links to the profile", async () => {
    state.analyze.mockImplementationOnce((_id, options) =>
      options.onSuccess({ status: "skipped", reason: "NO_CV_TEXT" }),
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Add the text of your primary CV first.");
    expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute("href", "/profile");
  });

  it("forgets a skip reason once a newer analysis arrives", async () => {
    state.analyze.mockImplementationOnce((_id, options) =>
      options.onSuccess({ status: "skipped", reason: "NO_CV_TEXT" }),
    );
    const user = userEvent.setup();
    const view = renderSection();

    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add the text of your primary CV first.");

    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <FitAnalysisSection
          application={application({ fitAnalysis: analysis })}
          aiAccessStatus={AiAccessStatus.APPROVED}
          aiUsage={usage()}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Add the text of your primary CV first.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open profile" })).not.toBeInTheDocument();
  });

  it("shows an error when the request fails", () => {
    state.error = new Error("network");
    renderSection();

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't analyze the fit. Try again.");
  });

  it("shows the daily limit notice without a request control when the limit is reached", () => {
    renderSection(application({ fitAnalysis: analysis }), AiAccessStatus.APPROVED, usage({ used: 30, exhausted: true }));

    expect(screen.getByText("Daily fit analysis limit reached")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("shows the limit notice when the server reports the limit after a run", () => {
    state.error = new ApiError(429, "limit", { code: "FIT_ANALYSIS_LIMIT_REACHED" });
    renderSection();

    expect(screen.getByText("Daily fit analysis limit reached")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyze" })).not.toBeInTheDocument();
    expect(screen.queryByText("Couldn't analyze the fit. Try again.")).not.toBeInTheDocument();
  });
});

describe("FitAnalysisSection AI access", () => {
  it.each([AiAccessStatus.NOT_REQUESTED, AiAccessStatus.PENDING, AiAccessStatus.SUSPENDED])(
    "blocks the analysis with a reason while AI access is %s",
    (status) => {
      renderSection(application(), status, undefined);

      const button = screen.getByRole("button", { name: "Analyze" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-describedby");
    },
  );

  it("keeps the entry point while the access status is still loading", () => {
    renderSection(application(), undefined, undefined);

    expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
  });

  it("renders nothing for rejected users without a stored analysis", () => {
    const { container } = renderSection(application(), AiAccessStatus.REJECTED, undefined);

    expect(container).toBeEmptyDOMElement();
  });

  it("keeps a stored analysis visible for rejected users but hides the entry point", () => {
    renderSection(application({ fitAnalysis: analysis }), AiAccessStatus.REJECTED, undefined);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
  });
});
