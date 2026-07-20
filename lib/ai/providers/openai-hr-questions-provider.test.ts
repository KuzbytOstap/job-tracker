import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { HrQuestionsProviderError } from "@/lib/ai/hr-questions-provider";

const parseMock = vi.fn();
vi.mock("@/lib/ai/openai-client", () => ({
  getOpenAIClient: () => ({ responses: { parse: parseMock } }),
}));

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
});

afterEach(() => {
  vi.unstubAllGlobals();
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
    expect(body.max_output_tokens).toBe(600);
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

  it("returns valid additional questions parsed from the response", async () => {
    parseMock.mockResolvedValue(
      completedResponse({ additionalQuestions: ["What is your Node.js experience?"] }),
    );

    const provider = new OpenAIHrQuestionsProvider();
    const result = await provider.generateAdditionalQuestions(BASE_INPUT);

    expect(result.additionalQuestions).toEqual(["What is your Node.js experience?"]);
  });

  it("rejects output with more than six questions", async () => {
    parseMock.mockResolvedValue(
      completedResponse({
        additionalQuestions: Array.from({ length: 7 }, (_, i) => `Question ${i}?`),
      }),
    );

    const provider = new OpenAIHrQuestionsProvider();

    await expect(provider.generateAdditionalQuestions(BASE_INPUT)).rejects.toBeInstanceOf(
      HrQuestionsProviderError,
    );
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
