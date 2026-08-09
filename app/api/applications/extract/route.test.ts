import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const getProviderMock = vi.fn();
vi.mock("@/lib/ai/get-application-extraction-provider", () => ({
  getApplicationExtractionProvider: () => getProviderMock(),
}));

const prismaFindManyMock = vi.fn();
const prismaCreateMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findMany: (...args: unknown[]) => prismaFindManyMock(...args),
      create: (...args: unknown[]) => prismaCreateMock(...args),
    },
  },
}));

const runGatedAiCallMock = vi.fn();
const requireAiAccessApprovedMock = vi.fn();
vi.mock("@/lib/ai/access-control", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/access-control")>("@/lib/ai/access-control");
  return {
    ...actual,
    runGatedAiCall: (...args: unknown[]) => runGatedAiCallMock(...args),
    requireAiAccessApproved: (...args: unknown[]) => requireAiAccessApprovedMock(...args),
  };
});

import { ApplicationExtractionProviderError } from "@/lib/ai/application-extraction-provider";
import type { ApplicationExtractionErrorKind } from "@/lib/ai/application-extraction-provider";
import { AiAccessError } from "@/lib/ai/access-control";
import { POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/applications/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  checkSessionMock.mockReset();
  getProviderMock.mockReset();
  prismaFindManyMock.mockReset();
  prismaCreateMock.mockReset();
  runGatedAiCallMock.mockReset();
  runGatedAiCallMock.mockImplementation(
    async ({ call }: { call: (reportUsage: (usage: unknown) => void) => Promise<unknown> }) =>
      call(() => {}),
  );
  requireAiAccessApprovedMock.mockReset();
  requireAiAccessApprovedMock.mockResolvedValue(undefined);
});

describe("POST /api/applications/extract", () => {
  it("returns 401 before invoking the provider when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(getProviderMock).not.toHaveBeenCalled();
  });

  it("returns 403 before invoking the provider when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(getProviderMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const request = new NextRequest("http://localhost:3000/api/applications/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(getProviderMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid input", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);

    const response = await POST(makeRequest({ jobPostingText: "" }));

    expect(response.status).toBe(400);
    expect(getProviderMock).not.toHaveBeenCalled();
  });

  it("returns 503 when provider configuration is missing", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getProviderMock.mockImplementation(() => {
      throw new ApplicationExtractionProviderError("AI_PROVIDER is not configured.");
    });

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(503);
  });

  it("returns 502 when the provider throws", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getProviderMock.mockReturnValue({
      name: "mock",
      extractApplication: vi.fn().mockRejectedValue(new Error("boom")),
    });

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("boom");
  });

  it("returns 200 with a schema-valid result on success", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getProviderMock.mockReturnValue({
      name: "mock",
      extractApplication: vi.fn().mockResolvedValue({
        company: "Acme",
        position: "Engineer",
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      }),
    });

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      result: {
        company: "Acme",
        position: "Engineer",
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      },
      sourceUrls: [],
      meta: { provider: "mock" },
    });
    expect(prismaFindManyMock).not.toHaveBeenCalled();
    expect(prismaCreateMock).not.toHaveBeenCalled();
  });

  it("extracts sourceUrls deterministically from the original job posting text for the mock provider", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getProviderMock.mockReturnValue({
      name: "mock",
      extractApplication: vi.fn().mockResolvedValue({
        company: "Acme",
        position: "Engineer",
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      }),
    });

    const response = await POST(
      makeRequest({
        jobPostingText: "Apply at https://example.com/jobs/1, or see https://example.com/jobs/1 again.",
      }),
    );

    const body = await response.json();
    expect(body.sourceUrls).toEqual(["https://example.com/jobs/1"]);
  });

  it("extracts sourceUrls deterministically from the original job posting text for the openai provider", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getProviderMock.mockReturnValue({
      name: "openai",
      maxOutputTokens: 1_000,
      extractApplication: vi.fn().mockResolvedValue({
        company: "Acme",
        position: "Engineer",
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      }),
    });

    const response = await POST(
      makeRequest({ jobPostingText: "Posting: https://jobs.dou.ua/companies/acme/vacancies/1/" }),
    );

    const body = await response.json();
    expect(body.sourceUrls).toEqual(["https://jobs.dou.ua/companies/acme/vacancies/1/"]);
  });

  it("returns 200 with provider metadata 'openai' for a successful mocked OpenAI result", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const extractApplicationMock = vi.fn().mockResolvedValue({
      company: "Acme",
      position: "Engineer",
      platform: null,
      link: null,
      salaryExpectation: null,
      notes: null,
    });
    getProviderMock.mockReturnValue({
      name: "openai",
      maxOutputTokens: 1_000,
      extractApplication: extractApplicationMock,
    });

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta).toEqual({ provider: "openai" });
    expect(extractApplicationMock).toHaveBeenCalledTimes(1);
    expect(prismaFindManyMock).not.toHaveBeenCalled();
    expect(prismaCreateMock).not.toHaveBeenCalled();
  });

  it("reserves quota before calling a real provider, keyed by the session user and the vacancy feature", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getProviderMock.mockReturnValue({
      name: "openai",
      maxOutputTokens: 1_000,
      countInputTokens: vi.fn().mockResolvedValue(42),
      extractApplication: vi.fn().mockResolvedValue({
        company: "Acme",
        position: "Engineer",
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      }),
    });

    await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(runGatedAiCallMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "test-user-id", feature: "VACANCY_GENERATION", maxOutputTokens: 1_000 }),
    );
  });

  it("passes a countInputTokens callback that delegates to the provider's own exact token counter", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const countInputTokensMock = vi.fn().mockResolvedValue(321);
    getProviderMock.mockReturnValue({
      name: "openai",
      maxOutputTokens: 1_000,
      countInputTokens: countInputTokensMock,
      extractApplication: vi.fn().mockResolvedValue({
        company: "Acme",
        position: "Engineer",
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      }),
    });

    await POST(makeRequest({ jobPostingText: "Some posting" }));

    const callArgs = runGatedAiCallMock.mock.calls[0][0];
    await expect(callArgs.countInputTokens()).resolves.toBe(321);
    expect(countInputTokensMock).toHaveBeenCalledWith({ jobPostingText: "Some posting" });
  });

  it("never gates the mock provider behind quota reservation, but still requires AI access approval", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getProviderMock.mockReturnValue({
      name: "mock",
      extractApplication: vi.fn().mockResolvedValue({
        company: "Acme",
        position: "Engineer",
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      }),
    });

    await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(runGatedAiCallMock).not.toHaveBeenCalled();
    expect(requireAiAccessApprovedMock).toHaveBeenCalledWith("test-user-id");
  });

  it("blocks the mock provider with a structured error when AI access is not approved, without calling it", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const extractApplicationMock = vi.fn();
    getProviderMock.mockReturnValue({ name: "mock", extractApplication: extractApplicationMock });
    requireAiAccessApprovedMock.mockRejectedValue(
      new AiAccessError("AI_ACCESS_REQUIRED", "AI access has not been approved yet."),
    );

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error: "AI access has not been approved yet.",
      details: { code: "AI_ACCESS_REQUIRED" },
    });
    expect(extractApplicationMock).not.toHaveBeenCalled();
  });

  it("maps an AiAccessError to a structured 403/429 response instead of a generic 502", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getProviderMock.mockReturnValue({
      name: "openai",
      maxOutputTokens: 1_000,
      extractApplication: vi.fn(),
    });
    runGatedAiCallMock.mockRejectedValue(
      new AiAccessError("VACANCY_LIMIT_REACHED", "Daily vacancy generation limit reached."),
    );

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({
      error: "Daily vacancy generation limit reached.",
      details: { code: "VACANCY_LIMIT_REACHED" },
    });
  });

  function providerErrorCase(kind: ApplicationExtractionErrorKind, expectedStatus: number) {
    it(`maps a "${kind}" provider error to HTTP ${expectedStatus}`, async () => {
      checkSessionMock.mockResolvedValue(AUTHORIZED);
      getProviderMock.mockReturnValue({
        name: "openai",
        maxOutputTokens: 1_000,
        extractApplication: vi
          .fn()
          .mockRejectedValue(new ApplicationExtractionProviderError("safe message", kind)),
      });

      const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

      expect(response.status).toBe(expectedStatus);
      const body = await response.json();
      expect(JSON.stringify(body)).not.toContain("OpenAI");
    });
  }

  providerErrorCase("configuration", 503);
  providerErrorCase("rate_limit", 429);
  providerErrorCase("timeout", 504);
  providerErrorCase("network", 502);
  providerErrorCase("invalid_result", 502);
});
