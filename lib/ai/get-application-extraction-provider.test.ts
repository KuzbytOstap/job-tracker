import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationExtractionProviderError } from "@/lib/ai/application-extraction-provider";
import { getApplicationExtractionProvider } from "@/lib/ai/get-application-extraction-provider";
import { MockApplicationExtractionProvider } from "@/lib/ai/providers/mock-application-extraction-provider";
import { OpenAIApplicationExtractionProvider } from "@/lib/ai/providers/openai-application-extraction-provider";

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

describe("getApplicationExtractionProvider", () => {
  it("returns the mock provider when AI_PROVIDER=mock", () => {
    process.env.AI_PROVIDER = "mock";
    const provider = getApplicationExtractionProvider();
    expect(provider).toBeInstanceOf(MockApplicationExtractionProvider);
  });

  it("does not create an OpenAI client when resolving the mock provider", () => {
    process.env.AI_PROVIDER = "mock";
    getApplicationExtractionProvider();
    expect(openAIConstructorMock).not.toHaveBeenCalled();
  });

  it("returns the OpenAI provider when AI_PROVIDER=openai, without creating the client eagerly", () => {
    process.env.AI_PROVIDER = "openai";
    const provider = getApplicationExtractionProvider();
    expect(provider).toBeInstanceOf(OpenAIApplicationExtractionProvider);
    expect(openAIConstructorMock).not.toHaveBeenCalled();
  });

  it("throws a configuration error when AI_PROVIDER is missing", () => {
    expect(() => getApplicationExtractionProvider()).toThrow(ApplicationExtractionProviderError);
  });

  it("throws a configuration error for an unsupported value", () => {
    process.env.AI_PROVIDER = "anthropic";
    expect(() => getApplicationExtractionProvider()).toThrow(ApplicationExtractionProviderError);
  });
});
