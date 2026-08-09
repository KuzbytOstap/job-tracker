// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsSection } from "@/components/admin/settings/settings-section";
import { getAdminSettings, updateAdminSettings } from "@/lib/api";
import type { AiGlobalLimitsDTO } from "@/lib/api-types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  getAdminSettings: vi.fn(),
  updateAdminSettings: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const getAdminSettingsMock = vi.mocked(getAdminSettings);
const updateAdminSettingsMock = vi.mocked(updateAdminSettings);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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
      <SettingsSection />
    </QueryClientProvider>,
  );
}

describe("SettingsSection", () => {
  it("shows an error state and retries on demand", async () => {
    getAdminSettingsMock.mockRejectedValue(new Error("network error"));

    renderSection();

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(getAdminSettingsMock).toHaveBeenCalledTimes(1);

    getAdminSettingsMock.mockResolvedValue(globalLimits());
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(getAdminSettingsMock).toHaveBeenCalledTimes(2));
  });

  it("loads current defaults with save disabled until changed", async () => {
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    const vacancyInput = await screen.findByLabelText("Vacancy generations / day");
    expect(vacancyInput).toHaveValue(10);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("saves edited global defaults", async () => {
    const user = userEvent.setup();
    getAdminSettingsMock.mockResolvedValue(globalLimits());
    updateAdminSettingsMock.mockResolvedValue(globalLimits({ vacancyGenerationLimit: 15 }));

    renderSection();

    const vacancyInput = await screen.findByLabelText("Vacancy generations / day");
    await user.clear(vacancyInput);
    await user.type(vacancyInput, "15");

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    await waitFor(() =>
      expect(updateAdminSettingsMock).toHaveBeenCalledWith({
        vacancyGenerationLimit: 15,
        hrGenerationLimit: 10,
        tokenLimit: 20_000,
      }),
    );
  });

  it("keeps save disabled while a field is invalid", async () => {
    const user = userEvent.setup();
    getAdminSettingsMock.mockResolvedValue(globalLimits());

    renderSection();

    const vacancyInput = await screen.findByLabelText("Vacancy generations / day");
    await user.clear(vacancyInput);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});
