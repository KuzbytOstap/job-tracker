import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { evaluateSession, isAllowedEmail } from "@/lib/auth";

const EXPIRES = new Date(Date.now() + 60_000).toISOString();

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAllowedEmail", () => {
  it("returns true for an email matching ALLOWED_EMAIL", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    expect(isAllowedEmail("me@example.com")).toBe(true);
  });

  it("returns false for a different email", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    expect(isAllowedEmail("someone-else@example.com")).toBe(false);
  });

  it("returns false for null", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    expect(isAllowedEmail(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    expect(isAllowedEmail(undefined)).toBe(false);
  });

  it("returns false for an empty string", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    expect(isAllowedEmail("")).toBe(false);
  });

  it("returns false for every input when ALLOWED_EMAIL is unset", () => {
    vi.stubEnv("ALLOWED_EMAIL", "");
    expect(isAllowedEmail("me@example.com")).toBe(false);
    expect(isAllowedEmail("")).toBe(false);
  });
});

describe("evaluateSession", () => {
  it("returns unauthenticated for a null session", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    expect(evaluateSession(null)).toEqual({ status: "unauthenticated" });
  });

  it("returns forbidden when the session email doesn't match ALLOWED_EMAIL", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    const session: Session = {
      user: { id: "test-user-id", email: "someone-else@example.com" },
      expires: EXPIRES,
    };
    expect(evaluateSession(session)).toEqual({ status: "forbidden" });
  });

  it("returns forbidden when the session has no user email", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    const session: Session = { user: { id: "test-user-id" }, expires: EXPIRES };
    expect(evaluateSession(session)).toEqual({ status: "forbidden" });
  });

  it("returns authorized when the session email matches ALLOWED_EMAIL", () => {
    vi.stubEnv("ALLOWED_EMAIL", "me@example.com");
    const session: Session = { user: { id: "test-user-id", email: "me@example.com" }, expires: EXPIRES };
    expect(evaluateSession(session)).toEqual({ status: "authorized", session });
  });
});
