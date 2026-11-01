import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isLocale, pickLocaleFromAcceptLanguage } from "@/lib/i18n/locales";

describe("isLocale", () => {
  it("accepts every supported locale", () => {
    for (const locale of LOCALES) {
      expect(isLocale(locale)).toBe(true);
    }
  });

  it("rejects unsupported, empty and non-string values", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("UK")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});

describe("pickLocaleFromAcceptLanguage", () => {
  it("falls back to the default for a missing or empty header", () => {
    expect(pickLocaleFromAcceptLanguage(undefined)).toBe(DEFAULT_LOCALE);
    expect(pickLocaleFromAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
    expect(pickLocaleFromAcceptLanguage("")).toBe(DEFAULT_LOCALE);
  });

  it("matches the primary subtag of a regional language", () => {
    expect(pickLocaleFromAcceptLanguage("uk-UA")).toBe("uk");
    expect(pickLocaleFromAcceptLanguage("en-GB,en;q=0.9")).toBe("en");
  });

  it("respects q-values when choosing between supported languages", () => {
    expect(pickLocaleFromAcceptLanguage("en;q=0.5, uk;q=0.9")).toBe("uk");
    expect(pickLocaleFromAcceptLanguage("uk;q=0.2, en;q=0.9")).toBe("en");
  });

  it("skips unsupported languages and takes the next supported one", () => {
    expect(pickLocaleFromAcceptLanguage("pl, de;q=0.8")).toBe(DEFAULT_LOCALE);
    expect(pickLocaleFromAcceptLanguage("pl, uk;q=0.5")).toBe("uk");
  });

  it("ignores languages with q=0", () => {
    expect(pickLocaleFromAcceptLanguage("uk;q=0, en")).toBe("en");
  });

  it("survives a malformed header", () => {
    expect(pickLocaleFromAcceptLanguage(",,;q=abc")).toBe(DEFAULT_LOCALE);
  });
});
