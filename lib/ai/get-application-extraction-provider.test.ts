import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApplicationExtractionProviderError } from "@/lib/ai/application-extraction-provider";
import { getApplicationExtractionProvider } from "@/lib/ai/get-application-extraction-provider";
import { MockApplicationExtractionProvider } from "@/lib/ai/providers/mock-application-extraction-provider";

const originalProviderEnv = process.env.AI_PROVIDER;

beforeEach(() => {
  delete process.env.AI_PROVIDER;
});

afterEach(() => {
  if (originalProviderEnv === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = originalProviderEnv;
});

describe("getApplicationExtractionProvider", () => {
  it("returns the mock provider when AI_PROVIDER=mock", () => {
    process.env.AI_PROVIDER = "mock";
    const provider = getApplicationExtractionProvider();
    expect(provider).toBeInstanceOf(MockApplicationExtractionProvider);
  });

  it("throws a configuration error when AI_PROVIDER is missing", () => {
    expect(() => getApplicationExtractionProvider()).toThrow(ApplicationExtractionProviderError);
  });

  it("throws a configuration error for an unsupported value", () => {
    process.env.AI_PROVIDER = "openai";
    expect(() => getApplicationExtractionProvider()).toThrow(ApplicationExtractionProviderError);
  });
});
