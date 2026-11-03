// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CvIdentitySuggestionsDTO, ProfileDTO } from "@/lib/api-types";
import { IdentitySuggestions } from "@/components/profile/identity-suggestions";

afterEach(() => {
  cleanup();
});

const EMPTY_PROFILE: ProfileDTO = {
  firstName: null,
  lastName: null,
  contactEmail: null,
  phone: null,
  address: { street: null, postalCode: null, city: null, region: null, country: null },
  salary: { amount: null, currency: null, period: null },
  employmentTypes: [],
  workFormats: [],
  coverLetterPrompt: null,
  defaultCoverLetterPrompt: "Default",
};

const SUGGESTIONS: CvIdentitySuggestionsDTO = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: null,
  city: "Lviv",
};

function renderSuggestions(profile: ProfileDTO, suggestions: CvIdentitySuggestionsDTO = SUGGESTIONS) {
  const onApply = vi.fn();
  const onDismiss = vi.fn();
  render(<IdentitySuggestions suggestions={suggestions} profile={profile} onApply={onApply} onDismiss={onDismiss} />);
  return { onApply, onDismiss };
}

describe("IdentitySuggestions", () => {
  it("starts with empty profile fields ticked and already filled fields unticked", () => {
    renderSuggestions({ ...EMPTY_PROFILE, firstName: "Ada L." });

    expect(screen.getByRole("checkbox", { name: "First name" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Last name" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Contact email" })).toBeChecked();
    expect(screen.getByText("Current: Ada L.")).toBeInTheDocument();
  });

  it("does not offer a field the CV did not provide", () => {
    renderSuggestions(EMPTY_PROFILE);

    expect(screen.queryByRole("checkbox", { name: "Phone" })).not.toBeInTheDocument();
  });

  it("applies only the ticked fields", async () => {
    const user = userEvent.setup();
    const { onApply } = renderSuggestions(EMPTY_PROFILE);

    await user.click(screen.getByRole("checkbox", { name: "Last name" }));
    await user.click(screen.getByRole("checkbox", { name: "Contact email" }));
    await user.click(screen.getByRole("button", { name: "Apply selected" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ firstName: "Ada", address: { city: "Lviv" } });
  });

  it("disables apply when nothing is ticked", async () => {
    const user = userEvent.setup();
    renderSuggestions(EMPTY_PROFILE);

    for (const name of ["First name", "Last name", "Contact email", "City"]) {
      await user.click(screen.getByRole("checkbox", { name }));
    }

    expect(screen.getByRole("button", { name: "Apply selected" })).toBeDisabled();
  });

  it("dismisses without applying anything", async () => {
    const user = userEvent.setup();
    const { onApply, onDismiss } = renderSuggestions(EMPTY_PROFILE);

    await user.click(screen.getByRole("button", { name: "Not now" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("says there is nothing to add and offers only a close button when no suggestion differs", async () => {
    const user = userEvent.setup();
    const empty: CvIdentitySuggestionsDTO = { firstName: null, lastName: null, email: null, phone: null, city: null };
    const { onApply, onDismiss } = renderSuggestions(EMPTY_PROFILE, empty);

    expect(screen.getByText("Nothing new to add from this CV.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply selected" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});
