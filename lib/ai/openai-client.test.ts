import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OpenAIConstructorMock = vi.fn();
vi.mock("openai", () => ({
  default: class MockOpenAI {
    constructor(config: unknown) {
      OpenAIConstructorMock(config);
    }
  },
}));

const originalApiKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  OpenAIConstructorMock.mockClear();
  vi.resetModules();
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

describe("getOpenAIClient", () => {
  it("does not create a client just by importing the module", async () => {
    await import("@/lib/ai/openai-client");
    expect(OpenAIConstructorMock).not.toHaveBeenCalled();
  });

  it("throws a shared, feature-agnostic configuration error when OPENAI_API_KEY is missing", async () => {
    const { getOpenAIClient, OpenAIConfigurationError } = await import("@/lib/ai/openai-client");

    expect(() => getOpenAIClient()).toThrow(OpenAIConfigurationError);
    expect(OpenAIConstructorMock).not.toHaveBeenCalled();
  });

  it("does not throw an extraction-specific error from the shared client", async () => {
    const { getOpenAIClient } = await import("@/lib/ai/openai-client");
    const { ApplicationExtractionProviderError } = await import(
      "@/lib/ai/application-extraction-provider"
    );

    expect(() => getOpenAIClient()).not.toThrow(ApplicationExtractionProviderError);
  });

  it("creates the client with maxRetries: 0 once requested", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    const { getOpenAIClient } = await import("@/lib/ai/openai-client");

    getOpenAIClient();

    expect(OpenAIConstructorMock).toHaveBeenCalledTimes(1);
    const config = OpenAIConstructorMock.mock.calls[0][0] as { maxRetries: number };
    expect(config.maxRetries).toBe(0);
  });

  it("creates the client with a finite ~30s timeout", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    const { getOpenAIClient } = await import("@/lib/ai/openai-client");

    getOpenAIClient();

    const config = OpenAIConstructorMock.mock.calls[0][0] as { timeout: number };
    expect(config.timeout).toBe(30_000);
  });

  it("reuses the same client instance across repeated calls", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    const { getOpenAIClient } = await import("@/lib/ai/openai-client");

    const first = getOpenAIClient();
    const second = getOpenAIClient();

    expect(first).toBe(second);
    expect(OpenAIConstructorMock).toHaveBeenCalledTimes(1);
  });

  it("never logs the API key", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key-do-not-log";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { getOpenAIClient } = await import("@/lib/ai/openai-client");
    getOpenAIClient();

    const allCalls = [...logSpy.mock.calls, ...errorSpy.mock.calls, ...warnSpy.mock.calls].flat();
    expect(
      allCalls.some((arg) => typeof arg === "string" && arg.includes("sk-test-key-do-not-log")),
    ).toBe(false);

    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
