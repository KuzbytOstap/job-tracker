import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();

vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

import ProtectedLayout from "./layout";

beforeEach(() => {
  checkSessionMock.mockReset();
  redirectMock.mockClear();
});

describe("ProtectedLayout", () => {
  it("redirects to /sign-in when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    await expect(ProtectedLayout({ children: "content" })).rejects.toThrow("REDIRECT:/sign-in");
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects to /sign-in when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    await expect(ProtectedLayout({ children: "content" })).rejects.toThrow("REDIRECT:/sign-in");
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });

  it("renders children without redirecting when authorized", async () => {
    checkSessionMock.mockResolvedValue({
      status: "authorized",
      session: { user: { email: "me@example.com" }, expires: new Date().toISOString() },
    });

    const result = await ProtectedLayout({ children: "content" });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
