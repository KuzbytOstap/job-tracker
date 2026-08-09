// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddApplicationDialog } from "@/components/dashboard/add-application-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  createApplication: vi.fn(),
  extractApplicationFromPosting: vi.fn(),
  getAiAccessStatus: vi.fn().mockResolvedValue({ status: "APPROVED" }),
  requestAiAccess: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

let mockIsDesktop = false;
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mockIsDesktop,
}));

function renderDialog() {
  const queryClient = new QueryClient();
  const onOpenChange = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <AddApplicationDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );

  return { onOpenChange };
}

beforeEach(() => {
  mockIsDesktop = false;
});

afterEach(() => {
  cleanup();
});

describe("AddApplicationDialog on mobile", () => {
  it("renders a full-screen header close control and exactly one Cancel and one Save action", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Add application" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^cancel$/i })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /add application/i })).toHaveLength(1);
  });

  it("closing via the header control on a dirty form asks for confirmation", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText("Company"), "Acme");
    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /discard changes/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closing via the header control on an untouched form closes immediately", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument();
  });
});

describe("AddApplicationDialog on desktop", () => {
  beforeEach(() => {
    mockIsDesktop = true;
  });

  it("keeps the centered dialog presentation with a title and description", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Add application" })).toBeInTheDocument();
    expect(screen.getByText("Track a new job application. It starts in Applied.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^cancel$/i })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /add application/i })).toHaveLength(1);
  });
});
