// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AiAccessNotice } from "@/components/ai/ai-access-notice";
import { requestAiAccess } from "@/lib/api";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  requestAiAccess: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const requestAiAccessMock = vi.mocked(requestAiAccess);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderNotice(status: "NOT_REQUESTED" | "PENDING" | "SUSPENDED") {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AiAccessNotice status={status} />
    </QueryClientProvider>,
  );
}

describe("AiAccessNotice", () => {
  it("shows the locked copy and a Request AI access action for NOT_REQUESTED", () => {
    renderNotice("NOT_REQUESTED");

    expect(screen.getByText("AI features are locked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request AI access" })).toBeInTheDocument();
  });

  it("shows the pending copy without an action for PENDING", () => {
    renderNotice("PENDING");

    expect(screen.getByText("AI access request pending")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the suspended copy without an action for SUSPENDED", () => {
    renderNotice("SUSPENDED");

    expect(screen.getByText("AI access is suspended")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("requests AI access and disables the button while pending", async () => {
    const user = userEvent.setup();
    let resolveRequest: (() => void) | undefined;
    requestAiAccessMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = () => resolve({ status: "PENDING" });
      }),
    );

    renderNotice("NOT_REQUESTED");

    const button = screen.getByRole("button", { name: "Request AI access" });
    await user.click(button);

    expect(requestAiAccessMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Requesting…" })).toBeDisabled());

    resolveRequest?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "Request AI access" })).toBeInTheDocument());
  });
});
