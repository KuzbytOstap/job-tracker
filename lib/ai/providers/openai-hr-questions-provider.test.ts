import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { HrQuestionsProviderError } from "@/lib/ai/hr-questions-provider";

const parseMock = vi.fn();
const inputTokensCountMock = vi.fn();
const getOpenAIClientMock = vi.fn(() => ({
  responses: { parse: parseMock, inputTokens: { count: inputTokensCountMock } },
}));
vi.mock("@/lib/ai/openai-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/openai-client")>("@/lib/ai/openai-client");
  return { ...actual, getOpenAIClient: () => getOpenAIClientMock() };
});

import { OpenAIConfigurationError } from "@/lib/ai/openai-client";
import { OpenAIHrQuestionsProvider } from "@/lib/ai/providers/openai-hr-questions-provider";

const BASE_INPUT = {
  company: "Acme Robotics",
  position: "Senior Frontend Engineer",
  platform: "OTHER",
  salaryExpectation: null,
  notes: null,
  jobPostingText: "We need a React/TypeScript engineer for our design system team.",
  coverLetterText: null,
};

function completedResponse(outputParsed: unknown) {
  return { status: "completed", output_parsed: outputParsed };
}

beforeEach(() => {
  parseMock.mockReset();
  inputTokensCountMock.mockReset();
  getOpenAIClientMock.mockReset();
  getOpenAIClientMock.mockReturnValue({
    responses: { parse: parseMock, inputTokens: { count: inputTokensCountMock } },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAIHrQuestionsProvider — countInputTokens", () => {
  it("returns the exact input token count reported by the Responses input-tokens endpoint", async () => {
    inputTokensCountMock.mockResolvedValue({ input_tokens: 87, object: "response.input_tokens" });

    const provider = new OpenAIHrQuestionsProvider();
    const count = await provider.countInputTokens(BASE_INPUT);

    expect(count).toBe(87);
    expect(inputTokensCountMock).toHaveBeenCalledTimes(1);
  });

  it("counts the exact same (already-truncated) request shape that generateAdditionalQuestions would send", async () => {
    inputTokensCountMock.mockResolvedValue({ input_tokens: 10, object: "response.input_tokens" });
    parseMock.mockResolvedValue(completedResponse({ additionalQuestions: [] }));

    const provider = new OpenAIHrQuestionsProvider();
    const input = { ...BASE_INPUT, notes: "a".repeat(5_000) };
    await provider.countInputTokens(input);
    await provider.generateAdditionalQuestions(input);

    const countBody = inputTokensCountMock.mock.calls[0][0];
    const parseBody = parseMock.mock.calls[0][0];
    expect(countBody.model).toBe(parseBody.model);
    expect(countBody.instructions).toBe(parseBody.instructions);
    expect(countBody.input).toBe(parseBody.input);
    expect(countBody.text).toEqual(parseBody.text);
    // The 4,000-char notes truncation must be reflected identically in both.
    expect(countBody.input).not.toContain("a".repeat(4_001));
  });

  it("maps a counting failure through the same error mapping as generation, without ever calling parse", async () => {
    inputTokensCountMock.mockRejectedValue(
      new OpenAI.RateLimitError(429, { message: "rate limited" }, "rate limited", new Headers()),
    );

    const provider = new OpenAIHrQuestionsProvider();

    await expect(provider.countInputTokens(BASE_INPUT)).rejects.toMatchObject({ kind: "rate_limit" });
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("maps a shared OpenAI client-configuration failure to its own configuration error", async () => {
    getOpenAIClientMock.mockImplementation(() => {
      throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured.");
    });

    const provider = new OpenAIHrQuestionsProvider();

    await expect(provider.countInputTokens(BASE_INPUT)).rejects.toMatchObject({ kind: "configuration" });
  });
});

describe("OpenAIHrQuestionsProvider", () => {
  it("makes zero real network calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    parseMock.mockResolvedValue(completedResponse({ additionalQuestions: [] }));

    const provider = new OpenAIHrQuestionsProvider();
    await provider.generateAdditionalQuestions(BASE_INPUT);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the pinned GPT-5 nano snapshot via the Responses API with strict structured output, no tools, and the small output limit", async () => {
    parseMock.mockResolvedValue(completedResponse({ additionalQuestions: [] }));

    const provider = new OpenAIHrQuestionsProvider();
    await provider.generateAdditionalQuestions(BASE_INPUT);

    expect(parseMock).toHaveBeenCalledTimes(1);
    const body = parseMock.mock.calls[0][0];
    expect(body.model).toBe("gpt-5-nano-2025-08-07");
    expect(body.store).toBe(false);
    expect(body.tools).toEqual([]);
    expect(body.stream).toBeUndefined();
    expect(body.max_output_tokens).toBe(400);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
  });

  it("performs exactly one request per call", async () => {
    parseMock.mockResolvedValue(completedResponse({ additionalQuestions: [] }));

    const provider = new OpenAIHrQuestionsProvider();
    await provider.generateAdditionalQuestions(BASE_INPUT);

    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("does not include the core questions in the structured output schema, only in instructions", async () => {
    parseMock.mockResolvedValue(completedResponse({ additionalQuestions: [] }));

    const provider = new OpenAIHrQuestionsProvider();
    await provider.generateAdditionalQuestions(BASE_INPUT);

    const body = parseMock.mock.calls[0][0];
    expect(typeof body.instructions).toBe("string");
    expect(body.instructions).toContain("Tell me about yourself.");
  });

  it("includes the single-question and concise-wording rules in the instructions", async () => {
    parseMock.mockResolvedValue(completedResponse({ additionalQuestions: [] }));

    const provider = new OpenAIHrQuestionsProvider();
    await provider.generateAdditionalQuestions(BASE_INPUT);

    const body = parseMock.mock.calls[0][0];
    expect(body.instructions).toContain("ask exactly one clear thing");
    expect(body.instructions).toContain("never exceed 140 characters");
    expect(body.instructions).toContain("zero to four additional questions");
  });

  it("returns valid additional questions parsed from the response", async () => {
    parseMock.mockResolvedValue(
      completedResponse({ additionalQuestions: ["What is your Node.js experience?"] }),
    );

    const provider = new OpenAIHrQuestionsProvider();
    const result = await provider.generateAdditionalQuestions(BASE_INPUT);

    expect(result.additionalQuestions).toEqual(["What is your Node.js experience?"]);
  });

  it("rejects output with more than four questions", async () => {
    parseMock.mockResolvedValue(
      completedResponse({
        additionalQuestions: Array.from({ length: 5 }, (_, i) => `Question ${i}?`),
      }),
    );

    const provider = new OpenAIHrQuestionsProvider();

    await expect(provider.generateAdditionalQuestions(BASE_INPUT)).rejects.toBeInstanceOf(
      HrQuestionsProviderError,
    );
  });

  it("rejects a question longer than 140 characters", async () => {
    parseMock.mockResolvedValue(
      completedResponse({ additionalQuestions: ["a".repeat(141)] }),
    );

    const provider = new OpenAIHrQuestionsProvider();

    await expect(provider.generateAdditionalQuestions(BASE_INPUT)).rejects.toBeInstanceOf(
      HrQuestionsProviderError,
    );
  });

  it("accepts a question exactly 140 characters long", async () => {
    const question = "a".repeat(140);
    parseMock.mockResolvedValue(completedResponse({ additionalQuestions: [question] }));

    const provider = new OpenAIHrQuestionsProvider();
    const result = await provider.generateAdditionalQuestions(BASE_INPUT);

    expect(result.additionalQuestions).toEqual([question]);
  });

  it("reports actual input/output/total token usage from the response to onUsage", async () => {
    parseMock.mockResolvedValue({
      status: "completed",
      output_parsed: { additionalQuestions: [] },
      usage: { input_tokens: 60, output_tokens: 12, total_tokens: 72 },
    });
    const onUsage = vi.fn();

    const provider = new OpenAIHrQuestionsProvider();
    await provider.generateAdditionalQuestions(BASE_INPUT, { onUsage });

    expect(onUsage).toHaveBeenCalledWith({
      model: "gpt-5-nano-2025-08-07",
      inputTokens: 60,
      outputTokens: 12,
      totalTokens: 72,
    });
  });

  it("never calls onUsage when the provider throws", async () => {
    parseMock.mockRejectedValue(new OpenAI.APIConnectionError({ message: "network down" }));
    const onUsage = vi.fn();
    const provider = new OpenAIHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions(BASE_INPUT, { onUsage }),
    ).rejects.toBeInstanceOf(HrQuestionsProviderError);
    expect(onUsage).not.toHaveBeenCalled();
  });

  it("handles missing parsed output as a safe invalid-result error", async () => {
    parseMock.mockResolvedValue(completedResponse(null));

    const provider = new OpenAIHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions(BASE_INPUT),
    ).rejects.toMatchObject({ kind: "invalid_result" });
  });

  it("handles refusal/incomplete output as a safe invalid-result error", async () => {
    parseMock.mockResolvedValue({ status: "incomplete", output_parsed: null });

    const provider = new OpenAIHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions(BASE_INPUT),
    ).rejects.toMatchObject({ kind: "invalid_result" });
  });

  it("maps a shared OpenAI client-configuration failure to its own configuration error", async () => {
    getOpenAIClientMock.mockImplementation(() => {
      throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured.");
    });

    const provider = new OpenAIHrQuestionsProvider();

    const error = await provider.generateAdditionalQuestions(BASE_INPUT).catch((e) => e);
    expect(error).toBeInstanceOf(HrQuestionsProviderError);
    expect(error).toMatchObject({ kind: "configuration" });
  });

  it("maps an authentication failure to a safe configuration error", async () => {
    parseMock.mockRejectedValue(
      new OpenAI.AuthenticationError(401, { message: "invalid api key" }, "invalid api key", new Headers()),
    );

    const provider = new OpenAIHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions(BASE_INPUT),
    ).rejects.toMatchObject({ kind: "configuration" });
  });

  it("maps a rate limit failure to a safe rate_limit error", async () => {
    parseMock.mockRejectedValue(
      new OpenAI.RateLimitError(429, { message: "rate limited" }, "rate limited", new Headers()),
    );

    const provider = new OpenAIHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions(BASE_INPUT),
    ).rejects.toMatchObject({ kind: "rate_limit" });
  });

  it("maps a timeout failure to a safe timeout error", async () => {
    parseMock.mockRejectedValue(new OpenAI.APIConnectionTimeoutError());

    const provider = new OpenAIHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions(BASE_INPUT),
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("maps a connection error to a safe network error", async () => {
    parseMock.mockRejectedValue(new OpenAI.APIConnectionError({ message: "network down" }));

    const provider = new OpenAIHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions(BASE_INPUT),
    ).rejects.toMatchObject({ kind: "network" });
  });

  it("never includes the source content in a thrown public error", async () => {
    const secretPosting = "SUPER SECRET JOB POSTING CONTENT 12345";
    parseMock.mockRejectedValue(
      new OpenAI.InternalServerError(500, { message: "server exploded" }, "server exploded", new Headers()),
    );

    const provider = new OpenAIHrQuestionsProvider();

    try {
      await provider.generateAdditionalQuestions({ ...BASE_INPUT, jobPostingText: secretPosting });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(secretPosting);
    }
  });
});
