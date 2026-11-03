import { describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { invalidateContextCaches, invalidateCvCaches } from "@/lib/sync-profile-caches";
import { queryKeys } from "@/lib/query-keys";

function fakeClient() {
  const invalidateQueries = vi.fn();
  return { client: { invalidateQueries } as unknown as QueryClient, invalidateQueries };
}

describe("invalidateContextCaches", () => {
  it("refreshes the item list and the CV update hint, and nothing else", () => {
    const { client, invalidateQueries } = fakeClient();

    invalidateContextCaches(client);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.profile.contextItems() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.profile.cvUpdateHint() });
  });
});

describe("invalidateCvCaches", () => {
  it("refreshes the CV list plus everything that depends on the primary CV", () => {
    const { client, invalidateQueries } = fakeClient();

    invalidateCvCaches(client);

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.profile.cvs() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.profile.contextItems() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.profile.cvUpdateHint() });
  });

  it("never touches the application or stats caches", () => {
    const { client, invalidateQueries } = fakeClient();

    invalidateCvCaches(client);

    const keys = invalidateQueries.mock.calls.map((call) => JSON.stringify(call[0].queryKey));
    expect(keys.some((key) => key.includes("applications") || key.includes("stats"))).toBe(false);
  });
});
