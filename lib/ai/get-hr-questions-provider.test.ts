import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HrQuestionsProviderError } from "@/lib/ai/hr-questions-provider";
import { getHrQuestionsProvider } from "@/lib/ai/get-hr-questions-provider";
import { MockHrQuestionsProvider } from "@/lib/ai/providers/mock-hr-questions-provider";
import { OpenAIHrQuestionsProvider } from "@/lib/ai/providers/openai-hr-questions-provider";

const originalProviderEnv = process.env.AI_PROVIDER;
const originalApiKeyEnv = process.env.OPENAI_API_KEY;

const openAIConstructorMock = vi.fn();
vi.mock("openai", () => ({
  default: class MockOpenAI {
    constructor(config: unknown) {
      openAIConstructorMock(config);
    }
  },
}));

beforeEach(() => {
  delete process.env.AI_PROVIDER;
  delete process.env.OPENAI_API_KEY;
  openAIConstructorMock.mockClear();
});

afterEach(() => {
  if (originalProviderEnv === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = originalProviderEnv;
  if (originalApiKeyEnv === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKeyEnv;
});

describe("getHrQuestionsProvider", () => {
  it("returns the mock provider when AI_PROVIDER=mock", () => {
    process.env.AI_PROVIDER = "mock";
    const provider = getHrQuestionsProvider();
    expect(provider).toBeInstanceOf(MockHrQuestionsProvider);
  });

  it("does not create an OpenAI client when resolving the mock provider", () => {
    process.env.AI_PROVIDER = "mock";
    getHrQuestionsProvider();
    expect(openAIConstructorMock).not.toHaveBeenCalled();
  });

  it("returns the OpenAI provider when AI_PROVIDER=openai, without creating the client eagerly", () => {
    process.env.AI_PROVIDER = "openai";
    const provider = getHrQuestionsProvider();
    expect(provider).toBeInstanceOf(OpenAIHrQuestionsProvider);
    expect(openAIConstructorMock).not.toHaveBeenCalled();
  });

  it("throws a configuration error when AI_PROVIDER is missing", () => {
    expect(() => getHrQuestionsProvider()).toThrow(HrQuestionsProviderError);
  });

  it("throws a configuration error for an unsupported value", () => {
    process.env.AI_PROVIDER = "anthropic";
    expect(() => getHrQuestionsProvider()).toThrow(HrQuestionsProviderError);
  });
});
