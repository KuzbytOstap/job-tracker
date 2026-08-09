// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsersSection } from "@/components/admin/users/users-section";
import { getAdminUsers, getAdminSettings, suspendAdminUserAiAccess } from "@/lib/api";
import type { AdminUserDTO, AiGlobalLimitsDTO } from "@/lib/api-types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  getAdminUsers: vi.fn(),
  getAdminSettings: vi.fn(),
  suspendAdminUserAiAccess: vi.fn(),
  restoreAdminUserAiAccess: vi.fn(),
  setAdminUserLimits: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const getAdminUsersMock = vi.mocked(getAdminUsers);
const getAdminSettingsMock = vi.mocked(getAdminSettings);
const suspendAdminUserAiAccessMock = vi.mocked(suspendAdminUserAiAccess);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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

function globalLimits(overrides: Partial<AiGlobalLimitsDTO> = {}): AiGlobalLimitsDTO {
  return {
    vacancyGenerationLimit: 10,
    hrGenerationLimit: 10,
    tokenLimit: 20_000,
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersSection />
    </QueryClientProvider>,
  );
}

describe("UsersSection", () => {
  it("shows an error state and retries on demand", async () => {
    getAdminUsersMock.mockRejectedValue(new Error("network error"));
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(getAdminUsersMock).toHaveBeenCalledTimes(1);

    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(getAdminUsersMock).toHaveBeenCalledTimes(2));
  });

  it("shows an empty state when there are no users", async () => {
    getAdminUsersMock.mockResolvedValue({ users: [] });
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByText("No users yet")).toBeInTheDocument();
  });

  it("renders a user's AI access status and usage against effective limits", async () => {
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getAllByText(/\/ 10/).length).toBeGreaterThan(0);
  });

  it("filters users by search", async () => {
    const user = userEvent.setup();
    getAdminUsersMock.mockResolvedValue({
      users: [adminUser(), adminUser({ id: "user-2", name: "Grace Hopper", email: "grace@example.com" })],
    });
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search users"), "grace");

    await waitFor(() => expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument());
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("suspends an approved user's AI access after confirmation", async () => {
    const user = userEvent.setup();
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    getAdminSettingsMock.mockResolvedValue(globalLimits());
    suspendAdminUserAiAccessMock.mockResolvedValue({ status: "SUSPENDED" });

    renderSection();

    await user.click(await screen.findByRole("button", { name: /suspend/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Suspend" }));

    await waitFor(() => expect(suspendAdminUserAiAccessMock).toHaveBeenCalledWith("user-1"));
  });
});
