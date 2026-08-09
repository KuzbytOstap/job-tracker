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

import { ApplicationExtractionProviderError } from "@/lib/ai/application-extraction-provider";
import type { ApplicationExtractionErrorKind } from "@/lib/ai/application-extraction-provider";
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
    getProviderMock.mockReturnValue({ name: "openai", extractApplication: extractApplicationMock });

    const response = await POST(makeRequest({ jobPostingText: "Some posting" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta).toEqual({ provider: "openai" });
    expect(extractApplicationMock).toHaveBeenCalledTimes(1);
    expect(prismaFindManyMock).not.toHaveBeenCalled();
    expect(prismaCreateMock).not.toHaveBeenCalled();
  });

  function providerErrorCase(kind: ApplicationExtractionErrorKind, expectedStatus: number) {
    it(`maps a "${kind}" provider error to HTTP ${expectedStatus}`, async () => {
      checkSessionMock.mockResolvedValue(AUTHORIZED);
      getProviderMock.mockReturnValue({
        name: "openai",
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
