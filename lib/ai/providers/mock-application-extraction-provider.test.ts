import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "@/app/generated/prisma/enums";
import { MockApplicationExtractionProvider } from "@/lib/ai/providers/mock-application-extraction-provider";

const originalDelayEnv = process.env.AI_MOCK_DELAY_MS;

beforeEach(() => {
  process.env.AI_MOCK_DELAY_MS = "0";
});

afterEach(() => {
  if (originalDelayEnv === undefined) delete process.env.AI_MOCK_DELAY_MS;
  else process.env.AI_MOCK_DELAY_MS = originalDelayEnv;
  vi.unstubAllGlobals();
});

describe("MockApplicationExtractionProvider", () => {
  it("returns the default complete fixture when no marker is present", async () => {
    const provider = new MockApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "Some ordinary posting text" });

    expect(result.company).not.toBeNull();
    expect(result.position).not.toBeNull();
  });

  it("returns the complete fixture for [mock:complete]", async () => {
    const provider = new MockApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "[mock:complete] posting" });

    expect(result.company).not.toBeNull();
    expect(result.position).not.toBeNull();
    expect(result.platform).not.toBeNull();
    expect(result.link).not.toBeNull();
    expect(result.salaryExpectation).not.toBeNull();
    expect(result.notes).not.toBeNull();
  });

  it("returns a partial fixture with nulls for [mock:partial]", async () => {
    const provider = new MockApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "[mock:partial] posting" });

    expect(result.company).not.toBeNull();
    expect(result.position).toBeNull();
    expect(result.platform).toBeNull();
  });

  it("returns a LinkedIn fixture for [mock:linkedin]", async () => {
    const provider = new MockApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "[mock:linkedin] posting" });

    expect(result.platform).toBe(Platform.LINKEDIN);
  });

  it("returns a Djinni fixture for [mock:djinni]", async () => {
    const provider = new MockApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "[mock:djinni] posting" });

    expect(result.platform).toBe(Platform.DJINNI);
  });

  it("returns a DOU fixture for [mock:dou]", async () => {
    const provider = new MockApplicationExtractionProvider();
    const result = await provider.extractApplication({ jobPostingText: "[mock:dou] posting" });

    expect(result.platform).toBe(Platform.DOU);
  });

  it("throws a controlled error for [mock:error]", async () => {
    const provider = new MockApplicationExtractionProvider();

    await expect(
      provider.extractApplication({ jobPostingText: "[mock:error] posting" }),
    ).rejects.toThrow();
  });

  it("is deterministic across repeated calls", async () => {
    const provider = new MockApplicationExtractionProvider();
    const first = await provider.extractApplication({ jobPostingText: "[mock:complete] posting" });
    const second = await provider.extractApplication({ jobPostingText: "[mock:complete] posting" });

    expect(first).toEqual(second);
  });

  it("makes zero network calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new MockApplicationExtractionProvider();
    await provider.extractApplication({ jobPostingText: "[mock:complete] posting" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
