import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileAiProviderError } from "@/lib/ai/profile-provider";
import { getProfileProvider } from "@/lib/ai/get-profile-provider";
import { MockProfileAiProvider } from "@/lib/ai/providers/mock-profile-provider";
import { OpenAIProfileAiProvider } from "@/lib/ai/providers/openai-profile-provider";

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

describe("getProfileProvider", () => {
  it("returns the mock provider when AI_PROVIDER=mock without creating an OpenAI client", () => {
    process.env.AI_PROVIDER = "mock";

    expect(getProfileProvider()).toBeInstanceOf(MockProfileAiProvider);
    expect(openAIConstructorMock).not.toHaveBeenCalled();
  });

  it("returns the OpenAI provider when AI_PROVIDER=openai", () => {
    process.env.AI_PROVIDER = "openai";

    expect(getProfileProvider()).toBeInstanceOf(OpenAIProfileAiProvider);
  });

  it("throws a configuration error when AI_PROVIDER is unset", () => {
    expect(() => getProfileProvider()).toThrow(ProfileAiProviderError);
    expect(() => getProfileProvider()).toThrow(expect.objectContaining({ kind: "configuration" }));
  });

  it("throws a configuration error for an unsupported provider", () => {
    process.env.AI_PROVIDER = "anthropic";

    expect(() => getProfileProvider()).toThrow(expect.objectContaining({ kind: "configuration" }));
  });
});

describe("MockProfileAiProvider", () => {
  it("scores a note with digits as SUBSTANTIAL, a covered note as COVERED and anything else as MINOR", async () => {
    const provider = new MockProfileAiProvider();

    await expect(provider.scoreContextItem.run({ cvText: "cv", itemText: "Cut load time by 40%" })).resolves.toEqual({
      weight: "SUBSTANTIAL",
      impact: 3,
    });
    await expect(
      provider.scoreContextItem.run({ cvText: "Built passkeys", itemText: "Built passkeys" }),
    ).resolves.toEqual({ weight: "COVERED", impact: null });
    await expect(provider.scoreContextItem.run({ cvText: "cv", itemText: "Open to travel" })).resolves.toEqual({
      weight: "MINOR",
      impact: null,
    });
  });

  it("fails on the error marker so failure paths can be exercised", async () => {
    await expect(
      new MockProfileAiProvider().scoreContextItem.run({ cvText: "cv", itemText: "[mock:profile-error]" }),
    ).rejects.toBeInstanceOf(ProfileAiProviderError);
  });
});
