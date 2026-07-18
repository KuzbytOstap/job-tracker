// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApplicationEditForm } from "@/components/applications/application-edit-form";
import { updateApplication } from "@/lib/api";
import type { ApplicationDTO } from "@/lib/api-types";
import { Status } from "@/app/generated/prisma/enums";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  updateApplication: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const updateApplicationMock = vi.mocked(updateApplication);

function fakeApplication(overrides: Partial<ApplicationDTO> = {}): ApplicationDTO {
  return {
    id: "app-1",
    company: "Acme",
    position: "Engineer",
    platform: "DIRECT",
    link: null,
    status: Status.APPLIED,
    hasTestTask: false,
    testTaskDone: false,
    salaryExpectation: null,
    notes: null,
    jobPostingText: null,
    coverLetterText: null,
    appliedAt: "2026-07-10T00:00:00.000Z",
    lastActivityAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    effectiveStatus: Status.APPLIED,
    isAutoIgnored: false,
    statusChanges: [],
    ...overrides,
  };
}

function renderForm(application: ApplicationDTO) {
  const queryClient = new QueryClient();
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  const onDirtyChange = vi.fn();
  const onPendingChange = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <ApplicationEditForm
        application={application}
        onSaved={onSaved}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
        onPendingChange={onPendingChange}
      />
    </QueryClientProvider>,
  );

  return { onSaved, onCancel, onDirtyChange, onPendingChange };
}

beforeEach(() => {
  updateApplicationMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("ApplicationEditForm — source materials", () => {
  it("initializes the source-material fields from the stored application", () => {
    const application = fakeApplication({
      jobPostingText: "Stored posting text",
      coverLetterText: "Stored cover letter",
    });
    renderForm(application);

    expect(screen.getByLabelText("Job posting")).toHaveValue("Stored posting text");
    expect(screen.getByLabelText("Cover letter")).toHaveValue("Stored cover letter");
  });

  it("expands the section by default when source text is already stored", () => {
    const application = fakeApplication({ jobPostingText: "Stored posting text" });
    renderForm(application);

    expect(screen.getByLabelText("Job posting")).toHaveValue("Stored posting text");
  });

  it("saves edited source text through the existing update mutation", async () => {
    const user = userEvent.setup();
    const application = fakeApplication({ jobPostingText: "Original posting" });
    updateApplicationMock.mockResolvedValue(fakeApplication({ jobPostingText: "Edited posting" }));
    const { onSaved } = renderForm(application);

    const jobPostingField = screen.getByLabelText("Job posting");
    await user.clear(jobPostingField);
    await user.type(jobPostingField, "Edited posting");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateApplicationMock).toHaveBeenCalledTimes(1));
    const [, payload] = updateApplicationMock.mock.calls[0];
    expect(payload.jobPostingText).toBe("Edited posting");
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it("clearing a source-text field saves null", async () => {
    const user = userEvent.setup();
    const application = fakeApplication({
      jobPostingText: "Original posting",
      coverLetterText: "Original cover letter",
    });
    updateApplicationMock.mockResolvedValue(fakeApplication({ jobPostingText: null, coverLetterText: null }));
    renderForm(application);

    await user.clear(screen.getByLabelText("Job posting"));
    await user.clear(screen.getByLabelText("Cover letter"));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateApplicationMock).toHaveBeenCalledTimes(1));
    const [, payload] = updateApplicationMock.mock.calls[0];
    expect(payload.jobPostingText).toBeNull();
    expect(payload.coverLetterText).toBeNull();
  });

  it("preserves entered source text when the update request fails", async () => {
    const user = userEvent.setup();
    const application = fakeApplication({ jobPostingText: "Original posting" });
    updateApplicationMock.mockRejectedValue(new Error("network error"));
    renderForm(application);

    const jobPostingField = screen.getByLabelText("Job posting");
    await user.clear(jobPostingField);
    await user.type(jobPostingField, "Edited posting");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateApplicationMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Job posting")).toHaveValue("Edited posting");
  });
});
