// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobilePipelineView } from "@/components/board/mobile-pipeline-view";
import type { ApplicationDTO } from "@/lib/api-types";
import { Status } from "@/app/generated/prisma/enums";

function fakeApplication(overrides: Partial<ApplicationDTO> = {}): ApplicationDTO {
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
    jobPostingText: null,
    coverLetterText: null,
    hrCallTranscript: null,
    appliedAt: "2026-07-10T00:00:00.000Z",
    lastActivityAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    effectiveStatus: Status.APPLIED,
    isAutoIgnored: false,
    statusChanges: [],
    hrInterviewQuestions: null,
    hrQuestionsGeneratedAt: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("MobilePipelineView", () => {
  it("defaults to All and groups applications by status in pipeline order, omitting empty groups", () => {
    const applied = fakeApplication({ id: "applied-1", company: "Applied Co", effectiveStatus: Status.APPLIED });
    const offer = fakeApplication({ id: "offer-1", company: "Offer Co", effectiveStatus: Status.OFFER });

    render(<MobilePipelineView applications={[applied, offer]} sort="newest" onSelectApplication={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings.indexOf("Applied1")).toBeLessThan(headings.indexOf("Offer1"));

    expect(screen.getByText("Applied Co")).toBeInTheDocument();
    expect(screen.getByText("Offer Co")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: /^Rejected/ })).not.toBeInTheDocument();
  });

  it("each application appears exactly once across groups", () => {
    const applications = [
      fakeApplication({ id: "a1", company: "Alpha", effectiveStatus: Status.APPLIED }),
      fakeApplication({ id: "a2", company: "Beta", effectiveStatus: Status.APPLIED }),
      fakeApplication({ id: "a3", company: "Gamma", effectiveStatus: Status.OFFER }),
    ];

    render(<MobilePipelineView applications={applications} sort="newest" onSelectApplication={vi.fn()} />);

    expect(screen.getAllByText("Alpha")).toHaveLength(1);
    expect(screen.getAllByText("Beta")).toHaveLength(1);
    expect(screen.getAllByText("Gamma")).toHaveLength(1);
  });

  it("selecting a status shows only that status and updates the count", async () => {
    const user = userEvent.setup();
    const applied = fakeApplication({ id: "applied-1", company: "Acme", effectiveStatus: Status.APPLIED });
    const offer = fakeApplication({ id: "offer-1", company: "Globex", effectiveStatus: Status.OFFER });

    render(<MobilePipelineView applications={[applied, offer]} sort="newest" onSelectApplication={vi.fn()} />);
    const nav = screen.getByRole("group", { name: "Filter applications by status" });

    await user.click(within(nav).getByRole("button", { name: /^Offer/ }));

    expect(within(nav).getByRole("button", { name: /^Offer/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(nav).getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Offer1" })).toBeInTheDocument();
  });

  it("shows an empty state when the selected status has no matching applications", async () => {
    const user = userEvent.setup();
    const applied = fakeApplication({ id: "applied-1", company: "Acme", effectiveStatus: Status.APPLIED });

    render(<MobilePipelineView applications={[applied]} sort="newest" onSelectApplication={vi.fn()} />);
    const nav = screen.getByRole("group", { name: "Filter applications by status" });

    await user.click(within(nav).getByRole("button", { name: /^Offer/ }));

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("invokes onSelectApplication when a card is clicked", async () => {
    const user = userEvent.setup();
    const onSelectApplication = vi.fn();
    const applied = fakeApplication({ id: "applied-1", company: "Acme", effectiveStatus: Status.APPLIED });

    render(<MobilePipelineView applications={[applied]} sort="newest" onSelectApplication={onSelectApplication} />);

    await user.click(screen.getByText("Acme"));

    expect(onSelectApplication).toHaveBeenCalledWith(applied);
  });

  it("shows a count for every status in navigation, including zero", () => {
    const applied = fakeApplication({ id: "applied-1", effectiveStatus: Status.APPLIED });

    render(<MobilePipelineView applications={[applied]} sort="newest" onSelectApplication={vi.fn()} />);

    const nav = screen.getByRole("group", { name: "Filter applications by status" });
    const offerButton = within(nav).getByRole("button", { name: /^Offer/ });
    expect(offerButton).toHaveTextContent("0");
  });
});
