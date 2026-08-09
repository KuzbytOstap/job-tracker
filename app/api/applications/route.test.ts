import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

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

import { GET, POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

beforeEach(() => {
  checkSessionMock.mockReset();
  findManyMock.mockReset();
  createMock.mockReset();
});

describe("GET /api/applications", () => {
  it("returns 401 before touching Prisma when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });
    const request = new NextRequest("http://localhost:3000/api/applications");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    const request = new NextRequest("http://localhost:3000/api/applications");

    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns the application list when authorized", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findManyMock.mockResolvedValue([]);
    const request = new NextRequest("http://localhost:3000/api/applications");

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ applications: [], total: 0 });
  });
});

function fakeCreatedRow(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-18T12:00:00.000Z");
  return {
    id: "app-1",
    company: "Acme",
    position: "Engineer",
    platform: "DIRECT",
    link: null,
    status: "APPLIED",
    hasTestTask: false,
    testTaskDone: false,
    salaryExpectation: null,
    notes: null,
    jobPostingText: null,
    coverLetterText: null,
    appliedAt: now,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
    statusChanges: [],
    ...overrides,
  };
}

describe("POST /api/applications", () => {
  it("returns 401 before touching Prisma when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });
    const request = new NextRequest("http://localhost:3000/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    const request = new NextRequest("http://localhost:3000/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("persists both source texts and returns them in the response", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    createMock.mockResolvedValue(
      fakeCreatedRow({ jobPostingText: "We are hiring an engineer.", coverLetterText: "Dear hiring manager," }),
    );
    const request = new NextRequest("http://localhost:3000/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: "Acme",
        position: "Engineer",
        platform: "DIRECT",
        jobPostingText: "We are hiring an engineer.",
        coverLetterText: "Dear hiring manager,",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobPostingText: "We are hiring an engineer.",
          coverLetterText: "Dear hiring manager,",
        }),
      }),
    );
    const body = await response.json();
    expect(body.jobPostingText).toBe("We are hiring an engineer.");
    expect(body.coverLetterText).toBe("Dear hiring manager,");
  });

  it("creates an application without source texts, storing them as null", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    createMock.mockResolvedValue(fakeCreatedRow());
    const request = new NextRequest("http://localhost:3000/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", position: "Engineer", platform: "DIRECT" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const createCallData = createMock.mock.calls[0][0].data;
    expect(createCallData.jobPostingText).toBeUndefined();
    expect(createCallData.coverLetterText).toBeUndefined();
    expect(createCallData.sourceUrls).toEqual([]);
    const body = await response.json();
    expect(body.jobPostingText).toBeNull();
    expect(body.coverLetterText).toBeNull();
  });

  it("derives sourceUrls deterministically from the submitted jobPostingText", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    createMock.mockResolvedValue(
      fakeCreatedRow({
        jobPostingText: "Apply at https://example.com/jobs/1.",
        sourceUrls: ["https://example.com/jobs/1"],
      }),
    );
    const request = new NextRequest("http://localhost:3000/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: "Acme",
        position: "Engineer",
        platform: "DIRECT",
        jobPostingText: "Apply at https://example.com/jobs/1.",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceUrls: ["https://example.com/jobs/1"] }),
      }),
    );
    const body = await response.json();
    expect(body.sourceUrls).toEqual(["https://example.com/jobs/1"]);
  });
});
