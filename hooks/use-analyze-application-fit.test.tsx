// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAnalyzeApplicationFit, useIsAnalyzingApplicationFit } from "@/hooks/use-analyze-application-fit";
import type { FitAnalysisOutcomeDTO } from "@/lib/api-types";

const api = vi.hoisted(() => ({ analyzeApplicationFit: vi.fn() }));

vi.mock("@/lib/api", () => ({ analyzeApplicationFit: api.analyzeApplicationFit }));

afterEach(() => {
  cleanup();
  api.analyzeApplicationFit.mockReset();
});

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useIsAnalyzingApplicationFit", () => {
  it("sees a run started by another hook instance that has already unmounted, only for that application", async () => {
    let finish: (outcome: FitAnalysisOutcomeDTO) => void = () => {};
    api.analyzeApplicationFit.mockReturnValue(
      new Promise<FitAnalysisOutcomeDTO>((resolve) => {
        finish = resolve;
      }),
    );
    const client = new QueryClient();
    const wrapper = wrapperFor(client);

    const starter = renderHook(() => useAnalyzeApplicationFit(), { wrapper });
    act(() => {
      starter.result.current.mutate("app-1");
    });
    starter.unmount();

    const sameApp = renderHook(() => useIsAnalyzingApplicationFit("app-1"), { wrapper });
    const otherApp = renderHook(() => useIsAnalyzingApplicationFit("app-2"), { wrapper });

    await waitFor(() => expect(sameApp.result.current).toBe(true));
    expect(otherApp.result.current).toBe(false);

    await act(async () => {
      finish({ status: "skipped", reason: "NO_VACANCY_TEXT" });
    });

    await waitFor(() => expect(sameApp.result.current).toBe(false));
    expect(api.analyzeApplicationFit).toHaveBeenCalledTimes(1);
  });
});
