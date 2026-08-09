import { describe, expect, it } from "vitest";
import { buildApplicationsWhere } from "@/lib/applications";

describe("buildApplicationsWhere", () => {
  it("scopes to the given userId with no search query", () => {
    expect(buildApplicationsWhere("", "user_1")).toEqual({ userId: "user_1" });
  });

  it("scopes to the given userId alongside the company/position search", () => {
    expect(buildApplicationsWhere("acme", "user_1")).toEqual({
      userId: "user_1",
      OR: [
        { company: { contains: "acme", mode: "insensitive" } },
        { position: { contains: "acme", mode: "insensitive" } },
      ],
    });
  });

  it("never omits userId, even for an empty query from a different user", () => {
    const whereA = buildApplicationsWhere("", "user_a");
    const whereB = buildApplicationsWhere("", "user_b");

    expect(whereA).not.toEqual(whereB);
    expect(whereA.userId).toBe("user_a");
    expect(whereB.userId).toBe("user_b");
  });
});
