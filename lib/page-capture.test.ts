import { describe, expect, it } from "vitest";
import { Platform } from "@/app/generated/prisma/enums";
import {
  FALLBACK_POSITION,
  buildPageText,
  cleanVacancyUrl,
  computeReviewReasons,
  fallbackCompany,
  fallbackPosition,
  isPrivatePageHost,
  normalizePageText,
  pageCaptureSchema,
  tryCleanVacancyUrl,
} from "@/lib/page-capture";
import type { PageCaptureInput } from "@/lib/page-capture";

function makeCapture(overrides: Partial<PageCaptureInput> = {}): PageCaptureInput {
  return { url: "https://jobs.example.com/role/1", pageText: "Body text", ...overrides };
}

describe("cleanVacancyUrl", () => {
  it("removes tracking parameters and the hash but keeps meaningful ones", () => {
    expect(
      cleanVacancyUrl("https://jobs.example.com/role/1?utm_source=x&gh_src=y&id=42&fbclid=z#apply"),
    ).toBe("https://jobs.example.com/role/1?id=42");
  });

  it("treats tracking parameter names case-insensitively", () => {
    expect(cleanVacancyUrl("https://jobs.example.com/r?UTM_Medium=a&Ref=b")).toBe("https://jobs.example.com/r");
  });

  it("throws for an invalid url while tryCleanVacancyUrl returns null", () => {
    expect(() => cleanVacancyUrl("not a url")).toThrow();
    expect(tryCleanVacancyUrl("not a url")).toBeNull();
    expect(tryCleanVacancyUrl("https://a.com/x?utm_source=1")).toBe("https://a.com/x");
  });
});

describe("pageCaptureSchema", () => {
  it("accepts a minimal capture and trims the url", () => {
    const parsed = pageCaptureSchema.parse({ url: "  https://a.com/x  ", pageText: "text" });
    expect(parsed.url).toBe("https://a.com/x");
  });

  it("rejects non http urls", () => {
    expect(pageCaptureSchema.safeParse({ url: "ftp://a.com", pageText: "t" }).success).toBe(false);
    expect(pageCaptureSchema.safeParse({ url: "javascript:alert(1)", pageText: "t" }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(pageCaptureSchema.safeParse({ url: "https://a.com", pageText: "t", extra: 1 }).success).toBe(false);
  });

  it("limits the number of structured data blocks", () => {
    const blocks = Array.from({ length: 6 }, () => "{}");
    expect(pageCaptureSchema.safeParse({ url: "https://a.com", pageText: "t", jsonLd: blocks }).success).toBe(false);
  });
});

describe("normalizePageText", () => {
  it("collapses blank runs and trailing whitespace", () => {
    expect(normalizePageText("  one \t\n\n\n\n two  \n")).toBe("one\n\n two");
  });
});

describe("buildPageText", () => {
  const url = "https://jobs.example.com/role/1";

  it("adds a header with the known metadata", () => {
    const text = buildPageText(makeCapture({ title: "Engineer", siteName: "Acme", description: "Great job" }), url, {
      includeStructuredData: false,
    });
    expect(text).toContain("Page title: Engineer");
    expect(text).toContain("Site name: Acme");
    expect(text).toContain(`Page URL: ${url}`);
    expect(text).toContain("Meta description: Great job");
    expect(text.endsWith("Body text")).toBe(true);
  });

  it("includes structured data only when requested and truncates it", () => {
    const capture = makeCapture({ jsonLd: ["x".repeat(6000)] });
    const without = buildPageText(capture, url, { includeStructuredData: false });
    const withData = buildPageText(capture, url, { includeStructuredData: true });
    expect(without).not.toContain("Structured data:");
    expect(withData).toContain("Structured data:");
    expect(withData.length).toBeLessThan(without.length + 5_100);
  });

  it("caps the stored length", () => {
    const text = buildPageText(makeCapture({ pageText: "a".repeat(100_000) }), url, { includeStructuredData: false });
    expect(text.length).toBeLessThanOrEqual(50_000);
  });
});

describe("fallbacks", () => {
  it("uses the site name or the host without www for the company", () => {
    expect(fallbackCompany(makeCapture({ siteName: "Acme" }), "https://www.acme.com/x")).toBe("Acme");
    expect(fallbackCompany(makeCapture(), "https://www.acme.com/x")).toBe("acme.com");
  });

  it("uses a trimmed and capped title for the position", () => {
    expect(fallbackPosition(makeCapture({ title: "  Engineer " }))).toBe("Engineer");
    expect(fallbackPosition(makeCapture({ title: "t".repeat(500) }))).toHaveLength(200);
    expect(fallbackPosition(makeCapture())).toBe(FALLBACK_POSITION);
    expect(fallbackPosition(makeCapture({ title: "   " }))).toBe(FALLBACK_POSITION);
  });
});

describe("computeReviewReasons", () => {
  const complete = {
    aiUsed: true,
    hasCompany: true,
    hasPosition: true,
    hasSalary: true,
    platform: Platform.DJINNI,
    hasCustomPlatform: false,
    notJobPosting: false,
  };

  it("returns nothing for a fully extracted application", () => {
    expect(computeReviewReasons(complete)).toEqual([]);
  });

  it("reports every missing piece in a stable order", () => {
    expect(
      computeReviewReasons({
        aiUsed: false,
        hasCompany: false,
        hasPosition: false,
        hasSalary: false,
        platform: Platform.OTHER,
        hasCustomPlatform: false,
        notJobPosting: true,
      }),
    ).toEqual(["not_vacancy", "details", "company", "position", "salary", "platform"]);
  });

  it("does not ask about the platform when a custom platform is set", () => {
    expect(computeReviewReasons({ ...complete, platform: Platform.OTHER, hasCustomPlatform: true })).toEqual([]);
  });
});

describe("isPrivatePageHost", () => {
  it("matches the host and its subdomains only", () => {
    expect(isPrivatePageHost("https://instagram.com/")).toBe(true);
    expect(isPrivatePageHost("https://www.instagram.com/direct")).toBe(true);
    expect(isPrivatePageHost("https://fakeinstagram.com/")).toBe(false);
    expect(isPrivatePageHost("https://example.com/instagram.com")).toBe(false);
  });
});
