// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { CoverLetterGeneratorDialog } from "@/components/applications/cover-letter-generator-dialog";
import type { AiUsageStatusResponse, CvDTO } from "@/lib/api-types";

const state = vi.hoisted(() => ({
  cvs: { isPending: false, isError: false, data: [] as unknown[], refetch: vi.fn() },
  generate: vi.fn(),
  pending: false,
  error: null as unknown,
  access: { data: { status: "APPROVED" } as { status: string } | undefined },
  usage: { data: undefined as unknown },
}));

vi.mock("@/hooks/use-cvs", () => ({ useCvs: () => state.cvs }));
vi.mock("@/hooks/use-generate-cover-letter", () => ({
  useGenerateCoverLetter: () => ({
    mutate: state.generate,
    isPending: state.pending,
    isError: state.error !== null,
    error: state.error,
  }),
}));
vi.mock("@/hooks/use-ai-access-status", () => ({ useAiAccessStatus: () => state.access }));
vi.mock("@/hooks/use-ai-usage-status", () => ({ useAiUsageStatus: () => state.usage }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function cv(overrides: Partial<CvDTO> = {}): CvDTO {
  return {
    id: "cv_1",
    label: "React Native",
    language: "en",
    isPrimary: true,
    fileName: "rn.pdf",
    fileSize: 1024,
    hasText: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

function usage(coverLetter: Partial<AiUsageStatusResponse["coverLetter"]> = {}): AiUsageStatusResponse {
  return {
    resetAt: "2026-11-04T00:00:00.000Z",
    vacancy: { used: 0, limit: 10, exhausted: false, pendingRequest: false },
    hr: { used: 0, limit: 10, exhausted: false, pendingRequest: false },
    profile: { used: 0, limit: 50, exhausted: false, pendingRequest: false },
    coverLetter: { used: 2, limit: 20, exhausted: false, pendingRequest: false, ...coverLetter },
    tokens: { used: 0, limit: 20_000, exhausted: false, pendingRequest: false },
  };
}

type DialogProps = Partial<Parameters<typeof CoverLetterGeneratorDialog>[0]>;

function renderDialog(props: DialogProps = {}) {
  const onUse = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CoverLetterGeneratorDialog
        jobPostingText="We need an engineer"
        company="Acme"
        position="Engineer"
        currentLetter=""
        onUse={onUse}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { onUse };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Generate cover letter" }));
  await screen.findByRole("dialog");
}

function succeedWith(...letters: string[]) {
  letters.forEach((letter) => {
    state.generate.mockImplementationOnce((_input, options) => options.onSuccess({ status: "ok", letter }));
  });
}

beforeEach(() => {
  state.cvs = { isPending: false, isError: false, data: [cv()], refetch: vi.fn() };
  state.generate.mockReset();
  state.pending = false;
  state.error = null;
  state.access = { data: { status: "APPROVED" } };
  state.usage = { data: usage() };
  vi.mocked(toast.success).mockClear();
});

afterEach(() => {
  cleanup();
});

describe("CoverLetterGeneratorDialog trigger", () => {
  it("is disabled with a visible reason while there is no job posting text", () => {
    renderDialog({ jobPostingText: "   " });

    expect(screen.getByRole("button", { name: "Generate cover letter" })).toBeDisabled();
    expect(screen.getByText("Add the job posting text to generate a letter.")).toBeInTheDocument();
  });

  it("is enabled once there is job posting text", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Generate cover letter" })).toBeEnabled();
    expect(screen.queryByText("Add the job posting text to generate a letter.")).not.toBeInTheDocument();
  });
});

describe("CoverLetterGeneratorDialog for users whose AI access was rejected", () => {
  it("shows no entry point at all", () => {
    state.access = { data: { status: "REJECTED" } };
    renderDialog();

    expect(screen.queryByRole("button", { name: "Generate cover letter" })).not.toBeInTheDocument();
    expect(screen.queryByText("Add the job posting text to generate a letter.")).not.toBeInTheDocument();
  });

  it("keeps the entry point while the access status is still loading", () => {
    state.access = { data: undefined };
    renderDialog();

    expect(screen.getByRole("button", { name: "Generate cover letter" })).toBeEnabled();
  });
});

describe("CoverLetterGeneratorDialog generation", () => {
  it("generates for the primary CV and shows the letter in a read only field", async () => {
    succeedWith("Dear Acme team");
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(state.generate).toHaveBeenCalledWith(
      { vacancyText: "We need an engineer", company: "Acme", position: "Engineer", cvId: "cv_1" },
      expect.any(Object),
    );
    const letter = screen.getByRole("textbox", { name: "Generated letter" });
    expect(letter).toHaveValue("Dear Acme team");
    expect(letter).toHaveAttribute("readonly");
  });

  it("falls back to the first CV with text when the primary CV has none", async () => {
    state.cvs.data = [cv({ id: "cv_1", hasText: false }), cv({ id: "cv_2", label: "Backend", isPrimary: false })];
    succeedWith("Letter");
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(state.generate).toHaveBeenCalledWith(expect.objectContaining({ cvId: "cv_2" }), expect.any(Object));
  });

  it("sends blank company and position as null", async () => {
    succeedWith("Letter");
    const user = userEvent.setup();
    renderDialog({ company: "  ", position: "" });

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(state.generate).toHaveBeenCalledWith(
      expect.objectContaining({ company: null, position: null }),
      expect.any(Object),
    );
  });

  it("offers another letter after the first one and replaces the shown text", async () => {
    succeedWith("First letter", "Second letter");
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "Write another" }));

    expect(state.generate).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("textbox", { name: "Generated letter" })).toHaveValue("Second letter");
  });

  it("shows the busy state while a letter is being written", async () => {
    state.pending = true;
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    const button = screen.getByRole("button", { name: "Writing the letter…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("shows how much of the daily letter limit is used", async () => {
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    expect(
      screen.getByText("Each letter uses one of your daily letters (2 / 20 used today)."),
    ).toBeInTheDocument();
  });

  it("shows an error when the request fails", async () => {
    state.error = new Error("network down");
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't write the letter. Try again.");
  });
});

describe("CoverLetterGeneratorDialog using the letter", () => {
  it("hands the letter over right away when the field is empty", async () => {
    succeedWith("Dear Acme team");
    const user = userEvent.setup();
    const { onUse } = renderDialog({ currentLetter: "   " });

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "Use letter" }));

    expect(onUse).toHaveBeenCalledWith("Dear Acme team");
    expect(toast.success).toHaveBeenCalledWith("Letter added to the form.");
  });

  it("asks before replacing an existing letter and keeps it when declined", async () => {
    succeedWith("Dear Acme team");
    const user = userEvent.setup();
    const { onUse } = renderDialog({ currentLetter: "My old letter" });

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "Use letter" }));

    expect(screen.getByText("Replace the current letter?")).toBeInTheDocument();
    expect(onUse).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Keep current" }));

    expect(onUse).not.toHaveBeenCalled();
    expect(screen.queryByText("Replace the current letter?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use letter" })).toBeInTheDocument();
  });

  it("replaces the existing letter after confirmation", async () => {
    succeedWith("Dear Acme team");
    const user = userEvent.setup();
    const { onUse } = renderDialog({ currentLetter: "My old letter" });

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "Use letter" }));
    await user.click(screen.getByRole("button", { name: "Replace" }));

    expect(onUse).toHaveBeenCalledWith("Dear Acme team");
  });
});

describe("CoverLetterGeneratorDialog when AI cannot run", () => {
  it("shows the daily limit notice without a request more control when the limit is already reached", async () => {
    state.usage = { data: usage({ used: 20, exhausted: true }) };
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    expect(screen.getByText("Daily cover letter limit reached")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request/i })).not.toBeInTheDocument();
  });

  it("shows the limit notice when the server reports the limit after a run", async () => {
    state.generate.mockImplementationOnce((_input, options) =>
      options.onSuccess({ status: "skipped", reason: "COVER_LETTER_LIMIT_REACHED" }),
    );
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.getByText("Daily cover letter limit reached")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
  });

  it("explains a missing CV text and links to the profile", async () => {
    state.generate.mockImplementationOnce((_input, options) =>
      options.onSuccess({ status: "skipped", reason: "NO_CV_TEXT" }),
    );
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Add the text of your primary CV first.");
    expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute("href", "/profile");
  });

  it("asks to add a CV when the profile has none", async () => {
    state.cvs.data = [];
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    expect(screen.getByText("Add a CV to your profile first.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute("href", "/profile");
    expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
  });

  it("asks to add CV text when no CV has any", async () => {
    state.cvs.data = [cv({ hasText: false })];
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    expect(
      screen.getByText("None of your CVs has text yet. Add the text of a CV in your profile."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
  });

  it("shows the access notice instead of the controls when AI access is not approved", async () => {
    state.access = { data: { status: "NOT_REQUESTED" } };
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    expect(screen.getByText("AI features are locked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
  });
});
