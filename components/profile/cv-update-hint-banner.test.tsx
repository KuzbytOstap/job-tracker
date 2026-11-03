// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CvUpdateHintDTO } from "@/lib/api-types";

const state = vi.hoisted(() => ({
  hint: undefined as unknown,
  snooze: vi.fn(),
  suggest: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-cv-update-hint", () => ({
  useCvUpdateHint: () => ({ data: state.hint }),
}));
vi.mock("@/hooks/use-snooze-cv-update-hint", () => ({
  useSnoozeCvUpdateHint: () => ({ mutate: state.snooze, isPending: false }),
}));
vi.mock("@/hooks/use-suggest-cv-updates", () => ({
  useSuggestCvUpdates: () => ({ mutate: state.suggest, isPending: false }),
}));

import { toast } from "sonner";
import { CvUpdateHintBanner } from "@/components/profile/cv-update-hint-banner";

function hint(overrides: Partial<CvUpdateHintDTO> = {}): CvUpdateHintDTO {
  return { visible: true, substantialCount: 2, snoozed: false, ...overrides };
}

beforeEach(() => {
  state.hint = hint();
  state.snooze.mockReset();
  state.suggest.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("CvUpdateHintBanner", () => {
  it("renders nothing when the hint is not visible or has not loaded", () => {
    state.hint = hint({ visible: false });
    const hidden = render(<CvUpdateHintBanner />);
    expect(hidden.container).toBeEmptyDOMElement();
    hidden.unmount();

    state.hint = undefined;
    const loading = render(<CvUpdateHintBanner />);
    expect(loading.container).toBeEmptyDOMElement();
  });

  it("shows the title and a count that agrees with the number of notes", () => {
    state.hint = hint({ substantialCount: 2 });
    const { rerender } = render(<CvUpdateHintBanner />);

    expect(screen.getByRole("heading", { name: "Time to update your CV" })).toBeInTheDocument();
    expect(screen.getByText("2 of your notes add things your CV doesn't say yet.")).toBeInTheDocument();

    state.hint = hint({ substantialCount: 1 });
    rerender(<CvUpdateHintBanner />);

    expect(screen.getByText("1 of your notes adds something your CV doesn't say yet.")).toBeInTheDocument();
  });

  it("postpones the reminder when the user chooses Remind me later", async () => {
    const user = userEvent.setup();
    render(<CvUpdateHintBanner />);

    await user.click(screen.getByRole("button", { name: "Remind me later" }));

    expect(state.snooze).toHaveBeenCalledTimes(1);
    expect(state.suggest).not.toHaveBeenCalled();
  });

  it("lists the suggested bullets and never changes anything else", async () => {
    const user = userEvent.setup();
    state.suggest.mockImplementation((_input, options) =>
      options.onSuccess({ status: "ok", suggestions: [{ itemId: "i1", bullet: "Shipped passkeys on iOS and Android" }] }),
    );
    render(<CvUpdateHintBanner />);

    await user.click(screen.getByRole("button", { name: "Show what to add" }));

    expect(screen.getByText("Suggested CV bullets")).toBeInTheDocument();
    expect(screen.getByText("Shipped passkeys on iOS and Android")).toBeInTheDocument();
    expect(state.snooze).not.toHaveBeenCalled();
  });

  it("says so when there is nothing to suggest", async () => {
    const user = userEvent.setup();
    state.suggest.mockImplementation((_input, options) => options.onSuccess({ status: "ok", suggestions: [] }));
    render(<CvUpdateHintBanner />);

    await user.click(screen.getByRole("button", { name: "Show what to add" }));

    expect(screen.getByText("No suggestions right now.")).toBeInTheDocument();
  });

  it("explains why suggestions were skipped", async () => {
    const user = userEvent.setup();
    state.suggest.mockImplementation((_input, options) =>
      options.onSuccess({ status: "skipped", reason: "AI_ACCESS_REQUIRED" }),
    );
    render(<CvUpdateHintBanner />);

    await user.click(screen.getByRole("button", { name: "Show what to add" }));

    expect(screen.getByText("AI access isn't approved yet.")).toBeInTheDocument();
  });

  it("copies a suggested bullet to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    state.suggest.mockImplementation((_input, options) =>
      options.onSuccess({ status: "ok", suggestions: [{ itemId: "i1", bullet: "Cut load time by 40%" }] }),
    );
    render(<CvUpdateHintBanner />);

    await user.click(screen.getByRole("button", { name: "Show what to add" }));
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith("Cut load time by 40%");
    expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");
  });
});
