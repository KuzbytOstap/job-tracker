import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";
import { AiAccessError } from "@/lib/ai/access-control";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const findManyMock = vi.fn();
const createMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

vi.mock("@/lib/user-settings", () => ({
  getAutoIgnoreAfterDays: async () => 21,
}));

vi.mock("@/lib/applications", () => ({
  APPLICATION_DETAIL_INCLUDE: {},
  toApplicationWithMeta: (application: unknown) => application,
  toApplicationDTO: (application: unknown) => application,
}));

const findPlatformMock = vi.fn();
vi.mock("@/lib/platforms-service", () => ({
  findVisiblePlatformByName: (...args: unknown[]) => findPlatformMock(...args),
}));

const extractionMock = vi.fn();
vi.mock("@/lib/ai/run-application-extraction", () => ({
  runApplicationExtraction: (...args: unknown[]) => extractionMock(...args),
}));

import { POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const LONG_TEXT = "Senior engineer responsibilities and requirements. ".repeat(12);

function request(body: unknown, host = "tracker.example.com"): NextRequest {
  return new NextRequest(`https://${host}/api/applications/from-page`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function capture(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://jobs.acme.com/roles/1?utm_source=feed",
    title: "Senior Engineer",
    pageText: LONG_TEXT,
    ...overrides,
  };
}

beforeEach(() => {
  checkSessionMock.mockReset();
  findManyMock.mockReset();
  createMock.mockReset();
  findPlatformMock.mockReset();
  extractionMock.mockReset();
  checkSessionMock.mockResolvedValue(AUTHORIZED);
  findManyMock.mockResolvedValue([]);
  createMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "app-1", ...data }));
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/applications/from-page", () => {
  it("rejects unauthenticated and forbidden sessions", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });
    expect((await POST(request(capture()))).status).toBe(401);

    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    expect((await POST(request(capture()))).status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects malformed json and invalid captures", async () => {
    expect((await POST(request("{oops"))).status).toBe(400);
    expect((await POST(request({ url: "ftp://x.com", pageText: "t" }))).status).toBe(400);
  });

  it("refuses to capture the tracker itself", async () => {
    const response = await POST(request(capture({ url: "https://tracker.example.com/board" })));

    expect(response.status).toBe(422);
    expect((await response.json()).details).toEqual({ code: "SELF_URL" });
    expect(extractionMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("refuses private pages before any extraction", async () => {
    const response = await POST(request(capture({ url: "https://www.instagram.com/direct/t/1" })));

    expect(response.status).toBe(422);
    expect((await response.json()).details).toEqual({ code: "PRIVATE_PAGE" });
    expect(extractionMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns the existing application for a duplicate cleaned url", async () => {
    findManyMock.mockResolvedValue([{ id: "existing", link: "https://jobs.acme.com/roles/1?utm_source=other" }]);

    const response = await POST(request(capture()));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("duplicate");
    expect(body.application.id).toBe("existing");
    expect(extractionMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates an application from the AI extraction with a cleaned link", async () => {
    extractionMock.mockResolvedValue({
      company: "Acme",
      position: "Backend Engineer",
      platform: null,
      salaryExpectation: "$4000",
      notes: "Summary",
    });

    const response = await POST(request(capture()));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("created");
    expect(body.extraction).toBe("ai");
    const data = createMock.mock.calls[0][0].data;
    expect(data.company).toBe("Acme");
    expect(data.position).toBe("Backend Engineer");
    expect(data.link).toBe("https://jobs.acme.com/roles/1");
    expect(data.userId).toBe("test-user-id");
    expect(data.reviewReasons).toEqual(["platform"]);
  });

  it("asks for confirmation when the AI says it is not a vacancy", async () => {
    extractionMock.mockResolvedValue({ company: null, position: null, platform: null, isJobPosting: false });

    const response = await POST(request(capture()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "needs_confirmation", reason: "not_vacancy" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("saves a not-a-vacancy page once the user confirmed", async () => {
    extractionMock.mockResolvedValue({ company: null, position: null, platform: null, isJobPosting: false });

    const response = await POST(request(capture({ confirmNotVacancy: true })));

    expect(response.status).toBe(201);
    expect(createMock.mock.calls[0][0].data.reviewReasons).toContain("not_vacancy");
  });

  it("falls back to page metadata when AI access is denied", async () => {
    extractionMock.mockRejectedValue(new AiAccessError("AI_ACCESS_REQUIRED", "no access"));

    const response = await POST(request(capture({ siteName: "Acme Careers" })));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.extraction).toBe("fallback");
    expect(body.fallbackReason).toBe("AI_ACCESS_REQUIRED");
    const data = createMock.mock.calls[0][0].data;
    expect(data.company).toBe("Acme Careers");
    expect(data.position).toBe("Senior Engineer");
    expect(data.reviewReasons).toEqual(expect.arrayContaining(["details", "company", "position", "salary"]));
  });

  it("falls back with a generic reason when extraction crashes", async () => {
    extractionMock.mockRejectedValue(new Error("provider down"));

    const response = await POST(request(capture()));

    expect(response.status).toBe(201);
    expect((await response.json()).fallbackReason).toBe("extraction_failed");
  });

  it("skips the AI entirely when the page has too little text", async () => {
    const response = await POST(request(capture({ pageText: "short" })));

    expect(response.status).toBe(201);
    expect((await response.json()).fallbackReason).toBe("page_text_too_short");
    expect(extractionMock).not.toHaveBeenCalled();
  });

  it("links a suggested platform that the user already has", async () => {
    extractionMock.mockResolvedValue({
      company: "Acme",
      position: "Dev",
      platform: null,
      suggestedPlatformName: "Wellfound",
    });
    findPlatformMock.mockResolvedValue({ platform: "OTHER", customPlatformId: "custom-1" });

    await POST(request(capture()));

    const data = createMock.mock.calls[0][0].data;
    expect(data.customPlatformId).toBe("custom-1");
    expect(data.suggestedPlatformName).toBeNull();
  });

  it("keeps an unknown suggested platform as a suggestion", async () => {
    extractionMock.mockResolvedValue({
      company: "Acme",
      position: "Dev",
      platform: null,
      suggestedPlatformName: "Wellfound",
    });
    findPlatformMock.mockResolvedValue(null);

    await POST(request(capture()));

    const data = createMock.mock.calls[0][0].data;
    expect(data.customPlatformId).toBeNull();
    expect(data.suggestedPlatformName).toBe("Wellfound");
  });

  it("returns 500 when saving fails", async () => {
    extractionMock.mockResolvedValue({ company: "Acme", position: "Dev", platform: null });
    createMock.mockRejectedValue(new Error("db down"));

    expect((await POST(request(capture()))).status).toBe(500);
  });
});
