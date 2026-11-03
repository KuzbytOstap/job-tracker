// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ContextItemDTO } from "@/lib/api-types";

const state = vi.hoisted(() => ({
  items: [] as unknown[],
  createPending: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  score: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-context-items", () => ({
  useContextItems: () => ({ data: state.items, isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/use-create-context-item", () => ({
  useCreateContextItem: () => ({ mutate: state.create, isPending: state.createPending }),
}));
vi.mock("@/hooks/use-update-context-item", () => ({
  useUpdateContextItem: () => ({ mutate: state.update, isPending: false }),
}));
vi.mock("@/hooks/use-delete-context-item", () => ({
  useDeleteContextItem: () => ({ mutate: state.remove, isPending: false }),
}));
vi.mock("@/hooks/use-score-context-items", () => ({
  useScoreContextItems: () => ({ mutate: state.score, isPending: false }),
}));

import { toast } from "sonner";
import { ContextItemsSection } from "@/components/profile/context-items-section";

function item(overrides: Partial<ContextItemDTO> = {}): ContextItemDTO {
  return {
    id: "item_1",
    text: "Shipped passkeys",
    weight: "SUBSTANTIAL",
    impact: 4,
    createdAt: "2026-11-03T10:00:00.000Z",
    updatedAt: "2026-11-03T10:00:00.000Z",
    ...overrides,
  };
}

function saveResult(skipped: string | null = null) {
  return { item: item(), scoring: { scored: skipped === null ? 1 : 0, remaining: 0, skipped } };
}

beforeEach(() => {
  state.items = [];
  state.createPending = false;
  state.create.mockReset();
  state.update.mockReset();
  state.remove.mockReset();
  state.score.mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  cleanup();
});

async function openAddField(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add item" }));
  return screen.getByLabelText("New item");
}

describe("ContextItemsSection adding items", () => {
  it("closes the field after Save stores the item", async () => {
    const user = userEvent.setup();
    state.create.mockImplementation((_text, options) => options.onSuccess(saveResult()));
    render(<ContextItemsSection />);

    const field = await openAddField(user);
    await user.type(field, "Shipped passkeys");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(state.create).toHaveBeenCalledWith("Shipped passkeys", expect.any(Object));
    expect(screen.queryByLabelText("New item")).not.toBeInTheDocument();
  });

  it("keeps an empty field open after Save and add another", async () => {
    const user = userEvent.setup();
    state.create.mockImplementation((_text, options) => options.onSuccess(saveResult()));
    render(<ContextItemsSection />);

    const field = await openAddField(user);
    await user.type(field, "Shipped passkeys");
    await user.click(screen.getByRole("button", { name: "Save and add another" }));

    expect(state.create).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("New item")).toHaveValue("");
  });

  it("trims the text and does not save a blank draft", async () => {
    const user = userEvent.setup();
    render(<ContextItemsSection />);

    const field = await openAddField(user);
    await user.type(field, "   ");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save and add another" })).toBeDisabled();

    await user.type(field, " Led a team  ");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(state.create.mock.calls[0][0]).toBe("Led a team");
  });

  it("keeps the typed text and shows an error when saving fails", async () => {
    const user = userEvent.setup();
    state.create.mockImplementation((_text, options) => options.onError(new Error("boom")));
    render(<ContextItemsSection />);

    const field = await openAddField(user);
    await user.type(field, "Shipped passkeys");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("New item")).toHaveValue("Shipped passkeys");
    expect(toast.error).toHaveBeenCalledWith("Couldn't save the item. Your text is kept.");
  });

  it("disables every action while a save is in flight so it cannot be submitted twice", async () => {
    const user = userEvent.setup();
    state.createPending = true;
    render(<ContextItemsSection />);

    const field = await openAddField(user);
    await user.type(field, "Shipped passkeys");

    expect(screen.getByRole("button", { name: "Save and add another" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("explains that scoring is paused when the save came back skipped for quota", async () => {
    const user = userEvent.setup();
    state.create.mockImplementation((_text, options) => options.onSuccess(saveResult("PROFILE_LIMIT_REACHED")));
    render(<ContextItemsSection />);

    const field = await openAddField(user);
    await user.type(field, "Shipped passkeys");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Scoring is paused: The daily profile AI limit is reached."),
    ).toBeInTheDocument();
  });
});

describe("ContextItemsSection list", () => {
  it("shows a badge for scored and unscored items", () => {
    state.items = [
      item({ id: "a", text: "Scored note", weight: "SUBSTANTIAL" }),
      item({ id: "b", text: "Pending note", weight: null, impact: null }),
      item({ id: "c", text: "Covered note", weight: "COVERED", impact: null }),
    ];
    render(<ContextItemsSection />);

    expect(screen.getByText("Adds something new")).toBeInTheDocument();
    expect(screen.getByText("Not scored yet")).toBeInTheDocument();
    expect(screen.getByText("Already in the CV")).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("shows the empty state when there are no items", () => {
    render(<ContextItemsSection />);

    expect(screen.getByText("No items yet.")).toBeInTheDocument();
  });

  it("edits an item in place and sends its id with the trimmed text", async () => {
    const user = userEvent.setup();
    state.items = [item({ id: "a", text: "Old text" })];
    render(<ContextItemsSection />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const field = screen.getByLabelText("Edit item");
    expect(field).toHaveValue("Old text");
    await user.clear(field);
    await user.type(field, "  New text ");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(state.update).toHaveBeenCalledWith({ id: "a", text: "New text" }, expect.any(Object));
  });
});

describe("ContextItemsSection scoring of pending items", () => {
  it("asks the server to finish scoring when unscored items exist", () => {
    state.items = [item({ weight: null, impact: null })];
    render(<ContextItemsSection />);

    expect(state.score).toHaveBeenCalledTimes(1);
  });

  it("does not ask for scoring when every item is already scored", () => {
    state.items = [item()];
    render(<ContextItemsSection />);

    expect(state.score).not.toHaveBeenCalled();
  });

  it("stops retrying once scoring reports it is paused and tells the user why", () => {
    state.items = [item({ weight: null, impact: null })];
    state.score.mockImplementation((_input, options) =>
      options.onSuccess({ scored: 0, remaining: 1, skipped: "NO_CV_TEXT" }),
    );
    render(<ContextItemsSection />);

    expect(state.score).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Scoring is paused: Add the text of your primary CV first."),
    ).toBeInTheDocument();
  });

  it("stops retrying when a batch scored nothing so it cannot loop", () => {
    state.items = [item({ weight: null, impact: null })];
    state.score.mockImplementation((_input, options) => options.onSuccess({ scored: 0, remaining: 1, skipped: null }));
    render(<ContextItemsSection />);

    expect(state.score).toHaveBeenCalledTimes(1);
  });
});
