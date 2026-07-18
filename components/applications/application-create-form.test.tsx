// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApplicationCreateForm } from "@/components/applications/application-create-form";
import { createApplication } from "@/lib/api";
import type { ApplicationDTO } from "@/lib/api-types";
import { Status } from "@/app/generated/prisma/enums";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  createApplication: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const createApplicationMock = vi.mocked(createApplication);

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

function renderForm() {
  const queryClient = new QueryClient();
  const onCreated = vi.fn();
  const onCancel = vi.fn();
  const onDirtyChange = vi.fn();
  const onPendingChange = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <ApplicationCreateForm
        onCreated={onCreated}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
        onPendingChange={onPendingChange}
      />
    </QueryClientProvider>,
  );

  return { onCreated, onCancel, onDirtyChange, onPendingChange };
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Company"), "Acme");
  await user.type(screen.getByLabelText("Position"), "Engineer");
}

beforeEach(() => {
  createApplicationMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("ApplicationCreateForm", () => {
  it("submits the existing payload shape with no new fields", async () => {
    const user = userEvent.setup();
    createApplicationMock.mockResolvedValue(fakeApplication());
    const { onCreated } = renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(createApplicationMock).toHaveBeenCalledTimes(1));
    const payload = createApplicationMock.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(
      ["appliedAt", "company", "hasTestTask", "link", "notes", "platform", "position", "salaryExpectation"].sort(),
    );
    expect(payload.company).toBe("Acme");
    expect(payload.position).toBe("Engineer");
    expect(payload.link).toBeUndefined();
    expect(payload.notes).toBeUndefined();
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });

  it("resets and closes the form after a successful submission", async () => {
    const user = userEvent.setup();
    createApplicationMock.mockResolvedValue(fakeApplication());
    const { onCreated } = renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText("Company")).toHaveValue(""));
  });

  it("keeps entered values when submission fails", async () => {
    const user = userEvent.setup();
    createApplicationMock.mockRejectedValue(new Error("network error"));
    const { onCreated } = renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(createApplicationMock).toHaveBeenCalledTimes(1));
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Company")).toHaveValue("Acme");
    expect(screen.getByLabelText("Position")).toHaveValue("Engineer");
  });

  it("cancel does not submit and closes immediately when the form is untouched", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(createApplicationMock).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancel on a dirty form asks for confirmation before discarding", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.type(screen.getByLabelText("Company"), "Acme");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(createApplicationMock).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /discard changes/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("pressing Enter in Notes inserts a newline instead of submitting", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderForm();

    await fillRequiredFields(user);
    const notes = screen.getByLabelText("Notes");
    await user.click(notes);
    await user.keyboard("first line{Enter}second line");

    expect(createApplicationMock).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(notes).toHaveValue("first line\nsecond line");
  });
});
