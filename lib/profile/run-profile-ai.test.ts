import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProfileProvider: vi.fn(),
  requireAiAccessApproved: vi.fn(),
  runGatedAiCall: vi.fn(),
}));

vi.mock("@/lib/ai/get-profile-provider", () => ({
  getProfileProvider: () => mocks.getProfileProvider(),
}));

vi.mock("@/lib/ai/access-control", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/access-control")>("@/lib/ai/access-control");
  return {
    ...actual,
    requireAiAccessApproved: (...args: unknown[]) => mocks.requireAiAccessApproved(...args),
    runGatedAiCall: (...args: unknown[]) => mocks.runGatedAiCall(...args),
  };
});

import { AiFeature } from "@/app/generated/prisma/client";
import { AiAccessError } from "@/lib/ai/access-control";
import { ProfileAiProviderError } from "@/lib/ai/profile-provider";
import { runProfileOperation } from "@/lib/profile/run-profile-ai";

function fakeProvider(name: "mock" | "openai") {
  const operation = {
    maxOutputTokens: 60,
    countInputTokens: vi.fn().mockResolvedValue(10),
    run: vi.fn().mockResolvedValue({ weight: "MINOR", impact: null }),
  };
  const provider = {
    name,
    extractCv: operation,
    scoreContextItem: operation,
    suggestCvUpdates: operation,
    generateCoverLetter: operation,
  };
  return { operation, provider };
}

const INPUT = { cvText: "cv", itemText: "note" };

beforeEach(() => {
  mocks.getProfileProvider.mockReset();
  mocks.requireAiAccessApproved.mockReset();
  mocks.runGatedAiCall.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("runProfileOperation", () => {
  it("checks access and runs the mock provider directly without quota reservation", async () => {
    const { operation, provider } = fakeProvider("mock");
    mocks.getProfileProvider.mockReturnValue(provider);

    const outcome = await runProfileOperation({ userId: "user_1", select: (p) => p.scoreContextItem, input: INPUT });

    expect(mocks.requireAiAccessApproved).toHaveBeenCalledWith("user_1");
    expect(operation.run).toHaveBeenCalledWith(INPUT);
    expect(mocks.runGatedAiCall).not.toHaveBeenCalled();
    expect(outcome).toEqual({ ok: true, result: { weight: "MINOR", impact: null } });
  });

  it("runs a real provider through the gated call with the PROFILE feature and its token ceiling", async () => {
    const { operation, provider } = fakeProvider("openai");
    mocks.getProfileProvider.mockReturnValue(provider);
    mocks.runGatedAiCall.mockImplementation(
      async (params: { call: (report: () => void) => Promise<unknown>; countInputTokens: () => Promise<number> }) => {
        await params.countInputTokens();
        return params.call(vi.fn());
      },
    );

    const outcome = await runProfileOperation({ userId: "user_1", select: (p) => p.scoreContextItem, input: INPUT });

    expect(mocks.runGatedAiCall).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_1", feature: AiFeature.PROFILE, maxOutputTokens: 60 }),
    );
    expect(operation.countInputTokens).toHaveBeenCalledWith(INPUT);
    expect(operation.run).toHaveBeenCalledWith(INPUT, { onUsage: expect.any(Function) });
    expect(mocks.requireAiAccessApproved).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(true);
  });

  it("reserves the feature it is given instead of PROFILE", async () => {
    const { provider } = fakeProvider("openai");
    mocks.getProfileProvider.mockReturnValue(provider);
    mocks.runGatedAiCall.mockImplementation(async (params: { call: (report: () => void) => Promise<unknown> }) =>
      params.call(vi.fn()),
    );

    await runProfileOperation({
      userId: "user_1",
      select: (p) => p.scoreContextItem,
      input: INPUT,
      feature: AiFeature.COVER_LETTER,
    });

    expect(mocks.runGatedAiCall).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_1", feature: AiFeature.COVER_LETTER }),
    );
  });

  it("returns the cover letter quota code when the gated call is rejected for that quota", async () => {
    mocks.getProfileProvider.mockReturnValue(fakeProvider("openai").provider);
    mocks.runGatedAiCall.mockRejectedValue(new AiAccessError("COVER_LETTER_LIMIT_REACHED", "limit"));

    await expect(
      runProfileOperation({
        userId: "user_1",
        select: (p) => p.scoreContextItem,
        input: INPUT,
        feature: AiFeature.COVER_LETTER,
      }),
    ).resolves.toEqual({ ok: false, reason: "COVER_LETTER_LIMIT_REACHED" });
  });

  it("returns the access error code instead of throwing", async () => {
    mocks.getProfileProvider.mockReturnValue(fakeProvider("mock").provider);
    mocks.requireAiAccessApproved.mockRejectedValue(new AiAccessError("AI_ACCESS_REQUIRED", "no access"));

    await expect(
      runProfileOperation({ userId: "user_1", select: (p) => p.scoreContextItem, input: INPUT }),
    ).resolves.toEqual({ ok: false, reason: "AI_ACCESS_REQUIRED" });
  });

  it("returns the profile quota code when the gated call is rejected for quota", async () => {
    mocks.getProfileProvider.mockReturnValue(fakeProvider("openai").provider);
    mocks.runGatedAiCall.mockRejectedValue(new AiAccessError("PROFILE_LIMIT_REACHED", "limit"));

    await expect(
      runProfileOperation({ userId: "user_1", select: (p) => p.scoreContextItem, input: INPUT }),
    ).resolves.toEqual({ ok: false, reason: "PROFILE_LIMIT_REACHED" });
  });

  it("maps provider errors, unknown errors and a missing provider configuration to PROVIDER_FAILED", async () => {
    const { operation, provider } = fakeProvider("mock");
    mocks.getProfileProvider.mockReturnValue(provider);

    operation.run.mockRejectedValueOnce(new ProfileAiProviderError("bad", "rate_limit"));
    await expect(
      runProfileOperation({ userId: "user_1", select: (p) => p.scoreContextItem, input: INPUT }),
    ).resolves.toEqual({ ok: false, reason: "PROVIDER_FAILED" });

    operation.run.mockRejectedValueOnce(new Error("boom"));
    await expect(
      runProfileOperation({ userId: "user_1", select: (p) => p.scoreContextItem, input: INPUT }),
    ).resolves.toEqual({ ok: false, reason: "PROVIDER_FAILED" });

    mocks.getProfileProvider.mockImplementation(() => {
      throw new ProfileAiProviderError("AI_PROVIDER is not configured.", "configuration");
    });
    await expect(
      runProfileOperation({ userId: "user_1", select: (p) => p.scoreContextItem, input: INPUT }),
    ).resolves.toEqual({ ok: false, reason: "PROVIDER_FAILED" });
  });

  it("never logs the user's text when an operation fails", async () => {
    const { operation, provider } = fakeProvider("mock");
    mocks.getProfileProvider.mockReturnValue(provider);
    operation.run.mockRejectedValue(new Error("boom"));

    await runProfileOperation({
      userId: "user_1",
      select: (p) => p.scoreContextItem,
      input: { cvText: "SECRET CV", itemText: "SECRET NOTE" },
    });

    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls);
    expect(logged).not.toContain("SECRET");
  });
});
