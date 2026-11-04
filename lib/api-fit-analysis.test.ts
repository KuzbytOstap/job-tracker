import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, analyzeApplicationFit, setAdminUserLimits, updateAdminSettings } from "@/lib/api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("analyzeApplicationFit", () => {
  it("POSTs without a body to the application's fit analysis endpoint and returns the outcome", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "skipped", reason: "NO_VACANCY_TEXT" }));

    const outcome = await analyzeApplicationFit("app_1");

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/applications/app_1/fit-analysis");
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(outcome).toEqual({ status: "skipped", reason: "NO_VACANCY_TEXT" });
  });

  it("throws an ApiError with the status for a missing application", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Application not found" }, 404));

    const error = await analyzeApplicationFit("app_1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404 });
  });
});

describe("admin limit payloads with the fit analysis limit", () => {
  it("sends the per user fit analysis override, including null to clear it", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));

    await setAdminUserLimits("user_1", { fitAnalysisGenerationLimit: 7 });
    await setAdminUserLimits("user_1", { fitAnalysisGenerationLimit: null });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/users/user_1/limits");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ fitAnalysisGenerationLimit: 7 });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ fitAnalysisGenerationLimit: null });
  });

  it("sends the global fit analysis limit", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await updateAdminSettings({ fitAnalysisGenerationLimit: 40 });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/settings");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ fitAnalysisGenerationLimit: 40 });
  });
});
