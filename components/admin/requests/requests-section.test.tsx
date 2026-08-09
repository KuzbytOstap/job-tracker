// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RequestsSection } from "@/components/admin/requests/requests-section";
import { getAdminAiRequests, getAdminUsers, decideAdminAiRequest } from "@/lib/api";
import type { AdminAiRequestDTO, AdminUserDTO } from "@/lib/api-types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  getAdminAiRequests: vi.fn(),
  getAdminUsers: vi.fn(),
  decideAdminAiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const getAdminAiRequestsMock = vi.mocked(getAdminAiRequests);
const getAdminUsersMock = vi.mocked(getAdminUsers);
const decideAdminAiRequestMock = vi.mocked(decideAdminAiRequest);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const baseUser = { id: "user-1", name: "Ada Lovelace", email: "ada@example.com" };

function aiAccessRequest(overrides: Partial<AdminAiRequestDTO> = {}): AdminAiRequestDTO {
  return {
    id: "req-1",
    type: "AI_ACCESS",
    status: "PENDING",
    quotaDate: null,
    message: null,
    decidedAt: null,
    decisionNote: null,
    grantedAmount: null,
    createdAt: "2026-08-09T10:00:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
    user: baseUser,
    decidedByUser: null,
    ...overrides,
  };
}

function usageRequest(overrides: Partial<AdminAiRequestDTO> = {}): AdminAiRequestDTO {
  return {
    id: "req-2",
    type: "VACANCY_LIMIT",
    status: "PENDING",
    quotaDate: "2026-08-09T00:00:00.000Z",
    message: null,
    decidedAt: null,
    decisionNote: null,
    grantedAmount: null,
    createdAt: "2026-08-09T10:00:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
    user: baseUser,
    decidedByUser: null,
    ...overrides,
  };
}

function adminUser(overrides: Partial<AdminUserDTO> = {}): AdminUserDTO {
  return {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "USER",
    aiAccessStatus: "APPROVED",
    usage: { vacancy: 3, hr: 1, tokens: 400 },
    limits: { vacancy: 10, hr: 10, tokens: 20_000 },
    overrides: { vacancy: null, hr: null, tokens: null },
    ...overrides,
  };
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RequestsSection />
    </QueryClientProvider>,
  );
}

describe("RequestsSection", () => {
  it("shows an error state and retries on demand", async () => {
    getAdminAiRequestsMock.mockRejectedValue(new Error("network error"));
    getAdminUsersMock.mockResolvedValue({ users: [] });

    renderSection();

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(getAdminAiRequestsMock).toHaveBeenCalledTimes(1);

    getAdminAiRequestsMock.mockResolvedValue({ requests: [] });
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(getAdminAiRequestsMock).toHaveBeenCalledTimes(2));
  });

  it("shows empty states when there are no requests", async () => {
    getAdminAiRequestsMock.mockResolvedValue({ requests: [] });
    getAdminUsersMock.mockResolvedValue({ users: [] });

    renderSection();

    expect(await screen.findByText("No pending AI access requests")).toBeInTheDocument();
    expect(screen.getByText("No pending usage-limit requests")).toBeInTheDocument();
    expect(screen.getByText("No decided requests yet")).toBeInTheDocument();
  });

  it("approves a pending AI_ACCESS request with an optional note", async () => {
    const user = userEvent.setup();
    getAdminAiRequestsMock.mockResolvedValue({ requests: [aiAccessRequest()] });
    getAdminUsersMock.mockResolvedValue({ users: [adminUser({ aiAccessStatus: "PENDING" })] });
    decideAdminAiRequestMock.mockResolvedValue(aiAccessRequest({ status: "APPROVED" }));

    renderSection();

    await user.click(await screen.findByRole("button", { name: /approve/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(decideAdminAiRequestMock).toHaveBeenCalledWith("req-1", {
        decision: "APPROVED",
        decisionNote: null,
      }),
    );
  });

  it("quick-approves a pending usage-limit request with +5", async () => {
    const user = userEvent.setup();
    getAdminAiRequestsMock.mockResolvedValue({ requests: [usageRequest()] });
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    decideAdminAiRequestMock.mockResolvedValue(usageRequest({ status: "APPROVED", grantedAmount: 5 }));

    renderSection();

    expect(await screen.findByText(/Currently used/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+5" }));

    await waitFor(() =>
      expect(decideAdminAiRequestMock).toHaveBeenCalledWith("req-2", {
        decision: "APPROVED",
        grantedAmount: 5,
      }),
    );
  });

  it("marks a stale usage-limit request and hides approve actions", async () => {
    getAdminAiRequestsMock.mockResolvedValue({
      requests: [usageRequest({ quotaDate: "2020-01-01T00:00:00.000Z" })],
    });
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });

    renderSection();

    expect(await screen.findByText("Stale")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+5" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+10" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Custom…" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });
});
