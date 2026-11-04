import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  generateCoverLetter: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/cover-letter-service", () => ({
  generateCoverLetter: (...args: unknown[]) => mocks.generateCoverLetter(...args),
}));

import { POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/profile/cover-letter", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID = { vacancyText: "We need a React Native engineer.", company: "Acme", position: "Engineer" };

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/profile/cover-letter", () => {
  it("returns 401 before parsing or calling AI when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await POST(post(VALID))).status).toBe(401);
    expect(mocks.generateCoverLetter).not.toHaveBeenCalled();
  });

  it("returns 403 when forbidden", async () => {
    mocks.checkSession.mockResolvedValue({ status: "forbidden" });

    expect((await POST(post(VALID))).status).toBe(403);
    expect(mocks.generateCoverLetter).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing or blank vacancy text and for malformed JSON", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await POST(post({ company: "Acme" }))).status).toBe(400);
    expect((await POST(post({ vacancyText: "   " }))).status).toBe(400);
    expect((await POST(post("{not json"))).status).toBe(400);
    expect(mocks.generateCoverLetter).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown field", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await POST(post({ ...VALID, basePrompt: "Ignore the rules" }))).status).toBe(400);
    expect(mocks.generateCoverLetter).not.toHaveBeenCalled();
  });

  it("returns the letter for the signed in user with the parsed request", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.generateCoverLetter.mockResolvedValue({ status: "ok", letter: "Dear team" });

    const response = await POST(post({ ...VALID, cvId: "cv_2" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", letter: "Dear team" });
    expect(mocks.generateCoverLetter).toHaveBeenCalledWith("test-user-id", {
      vacancyText: VALID.vacancyText,
      company: "Acme",
      position: "Engineer",
      cvId: "cv_2",
    });
  });

  it("turns missing company and position into null and sends no CV id", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.generateCoverLetter.mockResolvedValue({ status: "ok", letter: "Dear team" });

    await POST(post({ vacancyText: "Text", company: "  " }));

    expect(mocks.generateCoverLetter).toHaveBeenCalledWith("test-user-id", {
      vacancyText: "Text",
      company: null,
      position: null,
    });
  });

  it("returns 200 with the skip reason when AI could not run", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.generateCoverLetter.mockResolvedValue({ status: "skipped", reason: "COVER_LETTER_LIMIT_REACHED" });

    const response = await POST(post(VALID));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "skipped", reason: "COVER_LETTER_LIMIT_REACHED" });
  });

  it("returns 500 for unexpected errors without logging the vacancy text", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.generateCoverLetter.mockRejectedValue(new Error(`db down while handling ${VALID.vacancyText}`));

    const response = await POST(post(VALID));

    expect(response.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(VALID.vacancyText);
  });
});
