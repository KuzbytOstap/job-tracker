// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AiQuotaNotice } from "@/components/ai/ai-quota-notice";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

function renderNotice(
  reason:
    | "VACANCY_LIMIT_REACHED"
    | "PROFILE_LIMIT_REACHED"
    | "COVER_LETTER_LIMIT_REACHED"
    | "FIT_ANALYSIS_LIMIT_REACHED",
  pendingRequest = false,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AiQuotaNotice
        reason={reason}
        quota={{ used: 50, limit: 50, exhausted: true, pendingRequest }}
        resetAt="2026-08-10T00:00:00.000Z"
      />
    </QueryClientProvider>,
  );
}

describe("AiQuotaNotice", () => {
  it("shows the profile title without any request-more control", () => {
    renderNotice("PROFILE_LIMIT_REACHED");

    expect(screen.getByText("Daily profile AI limit reached")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the cover letter title without any request-more control", () => {
    renderNotice("COVER_LETTER_LIMIT_REACHED");

    expect(screen.getByText("Daily cover letter limit reached")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the fit analysis title without any request-more control", () => {
    renderNotice("FIT_ANALYSIS_LIMIT_REACHED");

    expect(screen.getByText("Daily fit analysis limit reached")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the request-more button for a requestable quota", () => {
    renderNotice("VACANCY_LIMIT_REACHED");

    expect(screen.getByText("Daily vacancy analysis limit reached")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
