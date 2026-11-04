// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProfileDTO } from "@/lib/api-types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mutateMock = vi.fn();
vi.mock("@/hooks/use-update-profile", () => ({
  useUpdateProfile: () => ({ mutate: mutateMock, isPending: false }),
}));

vi.mock("@/components/profile/cover-letter-examples", () => ({
  CoverLetterExamples: () => <div data-testid="examples" />,
}));

import { CoverLetterSection } from "@/components/profile/cover-letter-section";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const DEFAULT_PROMPT = "Write a lively letter of 150 to 250 words.";

function profile(overrides: Partial<ProfileDTO> = {}): ProfileDTO {
  return {
    firstName: null,
    lastName: null,
    contactEmail: null,
    phone: null,
    address: { street: null, postalCode: null, city: null, region: null, country: null },
    salary: { amount: null, currency: null, period: null },
    employmentTypes: [],
    workFormats: [],
    coverLetterPrompt: null,
    defaultCoverLetterPrompt: DEFAULT_PROMPT,
    ...overrides,
  };
}

describe("CoverLetterSection", () => {
  it("shows the default instructions with save and reset disabled while nothing is changed", () => {
    render(<CoverLetterSection profile={profile()} />);

    expect(screen.getByLabelText("Instructions for AI")).toHaveValue(DEFAULT_PROMPT);
    expect(screen.getByText("Using the recommended instructions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save instructions" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset to default" })).toBeDisabled();
  });

  it("saves an edited prompt as a custom value", async () => {
    const user = userEvent.setup();
    render(<CoverLetterSection profile={profile()} />);

    const textarea = screen.getByLabelText("Instructions for AI");
    await user.clear(textarea);
    await user.type(textarea, "Be brief.");
    await user.click(screen.getByRole("button", { name: "Save instructions" }));

    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock.mock.calls[0][0]).toEqual({ coverLetterPrompt: "Be brief." });
  });

  it("shows a stored custom prompt and resets to the default by sending null", async () => {
    const user = userEvent.setup();
    render(<CoverLetterSection profile={profile({ coverLetterPrompt: "Be brief." })} />);

    expect(screen.getByLabelText("Instructions for AI")).toHaveValue("Be brief.");
    expect(screen.getByText("Customized")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset to default" }));

    expect(mutateMock.mock.calls[0][0]).toEqual({ coverLetterPrompt: null });
  });

  it("sends null instead of a copy when the text is edited back to the default", async () => {
    const user = userEvent.setup();
    render(<CoverLetterSection profile={profile({ coverLetterPrompt: "Be brief." })} />);

    const textarea = screen.getByLabelText("Instructions for AI");
    await user.clear(textarea);
    await user.type(textarea, DEFAULT_PROMPT);
    await user.click(screen.getByRole("button", { name: "Save instructions" }));

    expect(mutateMock.mock.calls[0][0]).toEqual({ coverLetterPrompt: null });
  });

  it("renders the examples block", () => {
    render(<CoverLetterSection profile={profile()} />);

    expect(screen.getByTestId("examples")).toBeInTheDocument();
  });
});
