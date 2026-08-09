import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { evaluateSession } from "@/lib/auth";

const EXPIRES = new Date(Date.now() + 60_000).toISOString();

describe("evaluateSession", () => {
  it("returns unauthenticated for a null session", () => {
    expect(evaluateSession(null)).toEqual({ status: "unauthenticated" });
  });

  it("returns authorized for any valid Google session, regardless of email", () => {
    const session: Session = {
      user: { id: "test-user-id", email: "someone-new@example.com" },
      expires: EXPIRES,
    };
    expect(evaluateSession(session)).toEqual({ status: "authorized", session });
  });

  it("returns authorized for a session whose email was never previously allowlisted", () => {
    const session: Session = {
      user: { id: "another-user-id", email: "second-user@another-domain.com" },
      expires: EXPIRES,
    };
    expect(evaluateSession(session)).toEqual({ status: "authorized", session });
  });

  it("returns authorized even when the session has no user email", () => {
    const session: Session = { user: { id: "test-user-id" }, expires: EXPIRES };
    expect(evaluateSession(session)).toEqual({ status: "authorized", session });
  });
});
