import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  analyzeApplicationFit: vi.fn(),
}));

const errors = vi.hoisted(() => ({
  ApplicationNotFoundError: class ApplicationNotFoundError extends Error {
    constructor() {
      super("Application not found");
      this.name = "ApplicationNotFoundError";
    }
  },
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/fit-analysis-service", () => ({
  ApplicationNotFoundError: errors.ApplicationNotFoundError,
  analyzeApplicationFit: (...args: unknown[]) => mocks.analyzeApplicationFit(...args),
}));

import { ApplicationNotFoundError } from "@/lib/fit-analysis-service";
import { POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

function post(): NextRequest {
  return new NextRequest("http://localhost/api/applications/app_1/fit-analysis", { method: "POST" });
}

function context(id = "app_1") {
  return { params: Promise.resolve({ id }) };
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/applications/[id]/fit-analysis", () => {
  it("returns 401 without calling the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await POST(post(), context())).status).toBe(401);
    expect(mocks.analyzeApplicationFit).not.toHaveBeenCalled();
  });

  it("returns 403 without calling the service when forbidden", async () => {
    mocks.checkSession.mockResolvedValue({ status: "forbidden" });

    expect((await POST(post(), context())).status).toBe(403);
    expect(mocks.analyzeApplicationFit).not.toHaveBeenCalled();
  });

  it("returns the ok outcome with 200 and no-store for the session user and the route id", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    const outcome = { status: "ok", application: { id: "app_1", fitAnalysis: null } };
    mocks.analyzeApplicationFit.mockResolvedValue(outcome);

    const response = await POST(post(), context("app_1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(outcome);
    expect(mocks.analyzeApplicationFit).toHaveBeenCalledWith("test-user-id", "app_1");
  });

  it("returns a skipped outcome with 200 and no-store", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.analyzeApplicationFit.mockResolvedValue({ status: "skipped", reason: "NO_VACANCY_TEXT" });

    const response = await POST(post(), context());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "skipped", reason: "NO_VACANCY_TEXT" });
  });

  it("returns 404 for a missing or foreign application", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.analyzeApplicationFit.mockRejectedValue(new ApplicationNotFoundError());

    const response = await POST(post(), context());

    expect(response.status).toBe(404);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("returns 500 and logs only the error name on an unexpected failure", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    const error = new Error("Senior React engineer vacancy text and ada@example.com");
    error.name = "PrismaClientKnownRequestError";
    mocks.analyzeApplicationFit.mockRejectedValue(error);

    const response = await POST(post(), context());

    expect(response.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[fit-analysis] analysis failed", {
      name: "PrismaClientKnownRequestError",
    });
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("ada@example.com");
  });
});
