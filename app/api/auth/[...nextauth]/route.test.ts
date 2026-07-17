import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { GET } from "./route";

describe("GET /api/auth/[...nextauth]", () => {
  it("re-exports the NextAuth handler unmodified, with no authorization wrapper", () => {
    expect(GET).toBe(handlers.GET);
  });

  it("keeps the providers endpoint reachable without a session", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/providers");

    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("google");
  });
});
