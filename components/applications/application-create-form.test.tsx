// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApplicationCreateForm } from "@/components/applications/application-create-form";
import { createApplication, extractApplicationFromPosting } from "@/lib/api";
import type { ApplicationDTO } from "@/lib/api-types";
import type { ApplicationExtractionResponse } from "@/lib/application-extraction";
import { Status } from "@/app/generated/prisma/enums";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  createApplication: vi.fn(),
  extractApplicationFromPosting: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const createApplicationMock = vi.mocked(createApplication);
const extractApplicationFromPostingMock = vi.mocked(extractApplicationFromPosting);

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
    hrCallTranscript: null,
    appliedAt: "2026-07-10T00:00:00.000Z",
    lastActivityAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    effectiveStatus: Status.APPLIED,
    isAutoIgnored: false,
    statusChanges: [],
    hrInterviewQuestions: null,
    hrQuestionsGeneratedAt: null,
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

function fakeExtractionResponse(
  overrides: Partial<ApplicationExtractionResponse["result"]> = {},
): ApplicationExtractionResponse {
  return {
    result: {
      company: null,
      position: null,
      platform: null,
      link: null,
      salaryExpectation: null,
      notes: null,
      ...overrides,
    },
    meta: { provider: "mock" },
  };
}

beforeEach(() => {
  createApplicationMock.mockReset();
  extractApplicationFromPostingMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("ApplicationCreateForm", () => {
  it("submits the existing payload shape plus null source texts when the AI panel was never used", async () => {
    const user = userEvent.setup();
    createApplicationMock.mockResolvedValue(fakeApplication());
    const { onCreated } = renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(createApplicationMock).toHaveBeenCalledTimes(1));
    const payload = createApplicationMock.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(
      [
        "appliedAt",
        "company",
        "coverLetterText",
        "hasTestTask",
        "jobPostingText",
        "link",
        "notes",
        "platform",
        "position",
        "salaryExpectation",
      ].sort(),
    );
    expect(payload.company).toBe("Acme");
    expect(payload.position).toBe("Engineer");
    expect(payload.link).toBeUndefined();
    expect(payload.notes).toBeUndefined();
    expect(payload.jobPostingText).toBeNull();
    expect(payload.coverLetterText).toBeNull();
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

  it("keeps pasted source text in the form when the create request fails", async () => {
    const user = userEvent.setup();
    createApplicationMock.mockRejectedValue(new Error("network error"));
    const { onCreated } = renderForm();

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText("Job posting"), "posting text");
    await user.type(screen.getByLabelText("Cover letter (optional)"), "cover letter text");
    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(createApplicationMock).toHaveBeenCalledTimes(1));
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Job posting")).toHaveValue("posting text");
    expect(screen.getByLabelText("Cover letter (optional)")).toHaveValue("cover letter text");
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

  it("places the Cancel and Save actions after Notes in normal document flow, with no duplicates", () => {
    renderForm();

    const notes = screen.getByLabelText("Notes");
    const cancelButton = screen.getByRole("button", { name: /^cancel$/i });
    const saveButton = screen.getByRole("button", { name: /add application/i });

    expect(screen.getAllByRole("button", { name: /^cancel$/i })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /add application/i })).toHaveLength(1);

    const position = notes.compareDocumentPosition(cancelButton);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notes.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

describe("ApplicationCreateForm AI-assisted extraction", () => {
  it("Analyze does not submit the application", async () => {
    const user = userEvent.setup();
    extractApplicationFromPostingMock.mockResolvedValue(fakeExtractionResponse());
    renderForm();

    await user.type(screen.getByLabelText("Job posting"), "Some posting text");
    await user.click(screen.getByRole("button", { name: /analyze posting/i }));

    await waitFor(() => expect(extractApplicationFromPostingMock).toHaveBeenCalledTimes(1));
    expect(createApplicationMock).not.toHaveBeenCalled();
  });

  it("fills empty allowed fields from a non-null extraction and leaves null fields untouched", async () => {
    const user = userEvent.setup();
    extractApplicationFromPostingMock.mockResolvedValue(
      fakeExtractionResponse({ company: "Acme", position: "Engineer", notes: "Summary" }),
    );
    renderForm();

    await user.type(screen.getByLabelText("Job posting"), "posting text with mock partial marker");
    await user.click(screen.getByRole("button", { name: /analyze posting/i }));

    await waitFor(() => expect(screen.getByLabelText("Company")).toHaveValue("Acme"));
    expect(screen.getByLabelText("Position")).toHaveValue("Engineer");
    expect(screen.getByLabelText("Notes")).toHaveValue("Summary");
    expect(screen.getByLabelText("Salary expectation")).toHaveValue("");
    expect(screen.getByLabelText("Vacancy link")).toHaveValue("");
  });

  it("does not overwrite a field the user already edited manually", async () => {
    const user = userEvent.setup();
    extractApplicationFromPostingMock.mockResolvedValue(fakeExtractionResponse({ company: "Other Co" }));
    renderForm();

    await user.type(screen.getByLabelText("Company"), "My Own Co");
    await user.type(screen.getByLabelText("Job posting"), "posting text");
    await user.click(screen.getByRole("button", { name: /analyze posting/i }));

    await waitFor(() => expect(extractApplicationFromPostingMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Company")).toHaveValue("My Own Co");
  });

  it("leaves the applied date and test-task checkbox unchanged after extraction", async () => {
    const user = userEvent.setup();
    extractApplicationFromPostingMock.mockResolvedValue(
      fakeExtractionResponse({ company: "Acme", position: "Engineer" }),
    );
    renderForm();

    const appliedAtInput = screen.getByLabelText("Applied on") as HTMLInputElement;
    const appliedAtValueBefore = appliedAtInput.value;
    const testTaskCheckbox = screen.getByRole("checkbox", { name: /this application includes a test task/i });
    expect(testTaskCheckbox).not.toBeChecked();

    await user.type(screen.getByLabelText("Job posting"), "posting text");
    await user.click(screen.getByRole("button", { name: /analyze posting/i }));

    await waitFor(() => expect(screen.getByLabelText("Company")).toHaveValue("Acme"));
    expect(appliedAtInput.value).toBe(appliedAtValueBefore);
    expect(testTaskCheckbox).not.toBeChecked();
  });

  it("does not create an application automatically after extraction", async () => {
    const user = userEvent.setup();
    extractApplicationFromPostingMock.mockResolvedValue(
      fakeExtractionResponse({ company: "Acme", position: "Engineer" }),
    );
    renderForm();

    await user.type(screen.getByLabelText("Job posting"), "posting text");
    await user.click(screen.getByRole("button", { name: /analyze posting/i }));

    await waitFor(() => expect(screen.getByLabelText("Company")).toHaveValue("Acme"));
    expect(createApplicationMock).not.toHaveBeenCalled();
  });

  it("includes the pasted source text in the create payload exactly once, only on Save", async () => {
    const user = userEvent.setup();
    extractApplicationFromPostingMock.mockResolvedValue(
      fakeExtractionResponse({ company: "Acme", position: "Engineer" }),
    );
    createApplicationMock.mockResolvedValue(fakeApplication());
    renderForm();

    await user.type(screen.getByLabelText("Job posting"), "posting text");
    await user.click(screen.getByRole("button", { name: /analyze posting/i }));
    await waitFor(() => expect(screen.getByLabelText("Company")).toHaveValue("Acme"));
    expect(createApplicationMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(createApplicationMock).toHaveBeenCalledTimes(1));
    const payload = createApplicationMock.mock.calls[0][0];
    expect(Object.keys(payload).filter((key) => key === "jobPostingText")).toHaveLength(1);
    expect(payload.jobPostingText).toBe("posting text");
    expect(payload.coverLetterText).toBeNull();
  });

  it("includes both source texts, trimmed, when both are pasted", async () => {
    const user = userEvent.setup();
    createApplicationMock.mockResolvedValue(fakeApplication());
    const { onCreated } = renderForm();

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText("Job posting"), "  posting text  ");
    await user.type(screen.getByLabelText("Cover letter (optional)"), "  cover letter text  ");
    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(createApplicationMock).toHaveBeenCalledTimes(1));
    const payload = createApplicationMock.mock.calls[0][0];
    expect(payload.jobPostingText).toBe("posting text");
    expect(payload.coverLetterText).toBe("cover letter text");
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });

  it("normalizes a whitespace-only cover letter to null", async () => {
    const user = userEvent.setup();
    createApplicationMock.mockResolvedValue(fakeApplication());
    renderForm();

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText("Cover letter (optional)"), "   ");
    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(createApplicationMock).toHaveBeenCalledTimes(1));
    const payload = createApplicationMock.mock.calls[0][0];
    expect(payload.coverLetterText).toBeNull();
  });

  it("preserves source text and form values when extraction fails", async () => {
    const user = userEvent.setup();
    extractApplicationFromPostingMock.mockRejectedValue(new Error("network error"));
    renderForm();

    await user.type(screen.getByLabelText("Company"), "Acme");
    await user.type(screen.getByLabelText("Job posting"), "posting text");
    await user.click(screen.getByRole("button", { name: /analyze posting/i }));

    await waitFor(() => expect(extractApplicationFromPostingMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Job posting")).toHaveValue("posting text");
    expect(screen.getByLabelText("Company")).toHaveValue("Acme");
    expect(createApplicationMock).not.toHaveBeenCalled();
  });

  it("blocks duplicate Analyze clicks while a request is pending", async () => {
    const user = userEvent.setup();
    let resolveExtraction: (value: ApplicationExtractionResponse) => void = () => {};
    extractApplicationFromPostingMock.mockReturnValue(
      new Promise((resolve) => {
        resolveExtraction = resolve;
      }),
    );
    renderForm();

    await user.type(screen.getByLabelText("Job posting"), "posting text");
    const analyzeButton = screen.getByRole("button", { name: /analyze posting/i });
    await user.click(analyzeButton);
    await user.click(analyzeButton);
    await user.click(analyzeButton);

    expect(extractApplicationFromPostingMock).toHaveBeenCalledTimes(1);
    resolveExtraction(fakeExtractionResponse());
  });

  it("clears pasted source text after a successful application create", async () => {
    const user = userEvent.setup();
    extractApplicationFromPostingMock.mockResolvedValue(fakeExtractionResponse());
    createApplicationMock.mockResolvedValue(fakeApplication());
    renderForm();

    await user.type(screen.getByLabelText("Job posting"), "posting text");
    await user.click(screen.getByRole("button", { name: /analyze posting/i }));
    await waitFor(() => expect(extractApplicationFromPostingMock).toHaveBeenCalledTimes(1));

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /add application/i }));

    await waitFor(() => expect(createApplicationMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText("Job posting")).toHaveValue(""));
  });

  it("Cancel with pasted source text asks for confirmation before discarding", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.type(screen.getByLabelText("Job posting"), "posting text");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();
  });
});
