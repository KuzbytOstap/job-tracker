// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsersSection } from "@/components/admin/users/users-section";
import { getAdminUsers, getAdminSettings, setAdminUserLimits, suspendAdminUserAiAccess } from "@/lib/api";
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
const setAdminUserLimitsMock = vi.mocked(setAdminUserLimits);

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
    usage: { vacancy: 3, hr: 1, profile: 4, coverLetter: 2, fitAnalysis: 6, tokens: 400 },
    limits: { vacancy: 10, hr: 10, profile: 50, coverLetter: 20, fitAnalysis: 30, tokens: 20_000 },
    overrides: { vacancy: null, hr: null, profile: null, coverLetter: null, fitAnalysis: null, tokens: null },
    ...overrides,
  };
}

function globalLimits(overrides: Partial<AiGlobalLimitsDTO> = {}): AiGlobalLimitsDTO {
  return {
    vacancyGenerationLimit: 10,
    hrGenerationLimit: 10,
    profileGenerationLimit: 50,
    coverLetterGenerationLimit: 20,
    fitAnalysisGenerationLimit: 30,
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

  it("shows a Profile column with usage against the profile limit", async () => {
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByRole("columnheader", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("/ 50")).toBeInTheDocument();
  });

  it("shows a Letters column with usage against the cover letter limit", async () => {
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByRole("columnheader", { name: "Letters" })).toBeInTheDocument();
    expect(screen.getByText("/ 20")).toBeInTheDocument();
  });

  it("marks a cover letter limit pinned for one user as an override", async () => {
    getAdminUsersMock.mockResolvedValue({
      users: [
        adminUser({
          limits: { vacancy: 10, hr: 10, profile: 50, coverLetter: 5, fitAnalysis: 30, tokens: 20_000 },
          overrides: { vacancy: null, hr: null, profile: null, coverLetter: 5, fitAnalysis: null, tokens: null },
        }),
      ],
    });
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByText("/ 5")).toBeInTheDocument();
    expect(screen.getByText("override 5")).toBeInTheDocument();
  });

  it("shows a Fit column with usage against the fit analysis limit", async () => {
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByRole("columnheader", { name: "Fit" })).toBeInTheDocument();
    expect(screen.getByText("/ 30")).toBeInTheDocument();
  });

  it("marks a fit analysis limit pinned for one user as an override", async () => {
    getAdminUsersMock.mockResolvedValue({
      users: [
        adminUser({
          limits: { vacancy: 10, hr: 10, profile: 50, coverLetter: 20, fitAnalysis: 3, tokens: 20_000 },
          overrides: { vacancy: null, hr: null, profile: null, coverLetter: null, fitAnalysis: 3, tokens: null },
        }),
      ],
    });
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    expect(await screen.findByText("/ 3")).toBeInTheDocument();
    expect(screen.getByText("override 3")).toBeInTheDocument();
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

  it("pins a cover letter limit for one user from the limits dialog and leaves the other limits unpinned", async () => {
    const user = userEvent.setup();
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    getAdminSettingsMock.mockResolvedValue(globalLimits());
    setAdminUserLimitsMock.mockResolvedValue({
      vacancy: null,
      hr: null,
      profile: null,
      coverLetter: 7,
      fitAnalysis: null,
      tokens: null,
    });

    renderSection();

    await user.click(await screen.findByRole("button", { name: "Edit limits" }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText("Cover letters / day");
    expect(input).toHaveAttribute("placeholder", "Default: 20");
    await user.type(input, "7");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(setAdminUserLimitsMock).toHaveBeenCalledWith("user-1", {
        vacancyGenerationLimit: null,
        hrGenerationLimit: null,
        profileGenerationLimit: null,
        coverLetterGenerationLimit: 7,
        fitAnalysisGenerationLimit: null,
        tokenLimit: null,
      }),
    );
  });

  it("pins a fit analysis limit for one user from the limits dialog and leaves the other limits unpinned", async () => {
    const user = userEvent.setup();
    getAdminUsersMock.mockResolvedValue({ users: [adminUser()] });
    getAdminSettingsMock.mockResolvedValue(globalLimits());
    setAdminUserLimitsMock.mockResolvedValue({
      vacancy: null,
      hr: null,
      profile: null,
      coverLetter: null,
      fitAnalysis: 4,
      tokens: null,
    });

    renderSection();

    await user.click(await screen.findByRole("button", { name: "Edit limits" }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText("Fit analyses / day");
    expect(input).toHaveAttribute("placeholder", "Default: 30");
    await user.type(input, "4");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(setAdminUserLimitsMock).toHaveBeenCalledWith("user-1", {
        vacancyGenerationLimit: null,
        hrGenerationLimit: null,
        profileGenerationLimit: null,
        coverLetterGenerationLimit: null,
        fitAnalysisGenerationLimit: 4,
        tokenLimit: null,
      }),
    );
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
