import { describe, expect, it } from "vitest";
import { STRINGS, createTranslator } from "./strings.js";

function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("extension strings", () => {
  it("define the same keys in English and Ukrainian", () => {
    expect(Object.keys(STRINGS.uk).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });

  it("use the same placeholders in both languages", () => {
    for (const key of Object.keys(STRINGS.en)) {
      expect(placeholders(STRINGS.uk[key]), key).toEqual(placeholders(STRINGS.en[key]));
    }
  });

  it("have no empty values", () => {
    for (const lang of ["en", "uk"]) {
      for (const [key, value] of Object.entries(STRINGS[lang])) {
        expect(value.trim().length, `${lang}:${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("createTranslator", () => {
  it("translates and interpolates", () => {
    expect(createTranslator("en")("errorRequest", { status: 500 })).toBe("Request failed (500)");
    expect(createTranslator("uk")("errorRequest", { status: 500 })).toBe("Помилка запиту (500)");
  });

  it("falls back to English for an unknown language and to the key for unknown keys", () => {
    expect(createTranslator("de")("cancel")).toBe("Cancel");
    expect(createTranslator("en")("no.such.key")).toBe("no.such.key");
  });

  it("renders a missing param as an empty string", () => {
    expect(createTranslator("en")("errorRequest")).toBe("Request failed ()");
  });
});
