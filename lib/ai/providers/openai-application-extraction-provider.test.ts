import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { Platform } from "@/app/generated/prisma/enums";
import { ApplicationExtractionProviderError } from "@/lib/ai/application-extraction-provider";

const parseMock = vi.fn();
const getOpenAIClientMock = vi.fn(() => ({ responses: { parse: parseMock } }));
vi.mock("@/lib/ai/openai-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/openai-client")>("@/lib/ai/openai-client");
  return { ...actual, getOpenAIClient: () => getOpenAIClientMock() };
});

import { OpenAIConfigurationError } from "@/lib/ai/openai-client";
import { OpenAIApplicationExtractionProvider } from "@/lib/ai/providers/openai-application-extraction-provider";

function completedResponse(outputParsed: unknown) {
  return { status: "completed", output_parsed: outputParsed };
}

function fullyNullResult() {
  return {
    company: null,
    position: null,
    platform: null,
    link: null,
    salaryExpectation: null,
    notes: null,
  };
}

beforeEach(() => {
  parseMock.mockReset();
  getOpenAIClientMock.mockReset();
  getOpenAIClientMock.mockReturnValue({ responses: { parse: parseMock } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAIApplicationExtractionProvider", () => {
  it("makes zero real network calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    parseMock.mockResolvedValue(completedResponse(fullyNullResult()));

    const provider = new OpenAIApplicationExtractionProvider();
    await provider.extractApplication({ jobPostingText: "Some posting" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the pinned GPT-5 nano snapshot via the Responses API with strict structured output and no tools", async () => {
    parseMock.mockResolvedValue(completedResponse(fullyNullResult()));

    const provider = new OpenAIApplicationExtractionProvider();
    await provider.extractApplication({ jobPostingText: "Some posting" });

    expect(parseMock).toHaveBeenCalledTimes(1);
    const body = parseMock.mock.calls[0][0];
    expect(body.model).toBe("gpt-5-nano-2025-08-07");
    expect(body.store).toBe(false);
    expect(body.tools).toEqual([]);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
  });

  it("performs exactly one request per call", async () => {
    parseMock.mockResolvedValue(completedResponse(fullyNullResult()));

    const provider = new OpenAIApplicationExtractionProvider();
    await provider.extractApplication({ jobPostingText: "Some posting" });

    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("validates parsed output through the existing schema, normalizing empty strings to null", async () => {
    parseMock.mockResolvedValue(
      completedResponse({
        company: "Acme",
        position: "  ",
        platform: null,
        link: null,
        salaryExpectation: "",
        notes: "A short summary.",
      }),
    );

    const provider = new OpenAIApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "Some posting" });

    expect(result.company).toBe("Acme");
    expect(result.position).toBeNull();
    expect(result.salaryExpectation).toBeNull();
    expect(result.notes).toBe("A short summary.");
  });

  it("applies deterministic platform inference, overriding the model's platform value", async () => {
    parseMock.mockResolvedValue(
      completedResponse({
        company: "Acme",
        position: "Engineer",
        platform: Platform.OTHER,
        link: "https://www.linkedin.com/jobs/view/123",
        salaryExpectation: null,
        notes: null,
      }),
    );

    const provider = new OpenAIApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "Some posting" });

    expect(result.platform).toBe(Platform.LINKEDIN);
  });

  it("preserves null values instead of inventing data", async () => {
    parseMock.mockResolvedValue(completedResponse(fullyNullResult()));

    const provider = new OpenAIApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "Some posting" });

    expect(result).toEqual(fullyNullResult());
  });

  it("handles missing parsed output as a safe invalid-result error", async () => {
    parseMock.mockResolvedValue(completedResponse(null));

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toMatchObject({ kind: "invalid_result" });
  });

  it("handles malformed structured output that fails schema validation", async () => {
    parseMock.mockResolvedValue(
      completedResponse({
        company: "Acme",
        position: "Engineer",
        platform: null,
        link: "not-a-valid-url",
        salaryExpectation: null,
        notes: null,
      }),
    );

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toBeInstanceOf(ApplicationExtractionProviderError);
  });

  it("handles refusal/incomplete output as a safe invalid-result error", async () => {
    parseMock.mockResolvedValue({ status: "incomplete", output_parsed: null });

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toMatchObject({ kind: "invalid_result" });
  });

  it("maps a shared OpenAI client-configuration failure to its own configuration error", async () => {
    getOpenAIClientMock.mockImplementation(() => {
      throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured.");
    });

    const provider = new OpenAIApplicationExtractionProvider();

    const error = await provider
      .extractApplication({ jobPostingText: "Some posting" })
      .catch((e) => e);
    expect(error).toBeInstanceOf(ApplicationExtractionProviderError);
    expect(error).toMatchObject({ kind: "configuration" });
  });

  it("maps an authentication failure to a safe configuration error", async () => {
    parseMock.mockRejectedValue(
      new OpenAI.AuthenticationError(401, { message: "invalid api key" }, "invalid api key", new Headers()),
    );

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toMatchObject({ kind: "configuration" });
  });

  it("maps a permission-denied failure to a safe configuration error", async () => {
    parseMock.mockRejectedValue(
      new OpenAI.PermissionDeniedError(403, { message: "forbidden" }, "forbidden", new Headers()),
    );

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toMatchObject({ kind: "configuration" });
  });

  it("maps a rate limit failure to a safe rate_limit error", async () => {
    parseMock.mockRejectedValue(
      new OpenAI.RateLimitError(429, { message: "rate limited" }, "rate limited", new Headers()),
    );

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toMatchObject({ kind: "rate_limit" });
  });

  it("maps a timeout failure to a safe timeout error", async () => {
    parseMock.mockRejectedValue(new OpenAI.APIConnectionTimeoutError());

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("maps a generic network/service error safely", async () => {
    parseMock.mockRejectedValue(
      new OpenAI.InternalServerError(500, { message: "server exploded" }, "server exploded", new Headers()),
    );

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toBeInstanceOf(ApplicationExtractionProviderError);
  });

  it("maps a connection error to a safe network error", async () => {
    parseMock.mockRejectedValue(new OpenAI.APIConnectionError({ message: "network down" }));

    const provider = new OpenAIApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "Some posting" }),
    ).rejects.toMatchObject({ kind: "network" });
  });

  it("never includes the pasted source text in a thrown public error", async () => {
    const secretPosting = "SUPER SECRET JOB POSTING CONTENT 12345";
    parseMock.mockRejectedValue(
      new OpenAI.InternalServerError(500, { message: "server exploded" }, "server exploded", new Headers()),
    );

    const provider = new OpenAIApplicationExtractionProvider();

    try {
      await provider.extractApplication({ jobPostingText: secretPosting });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(secretPosting);
    }
  });
});
