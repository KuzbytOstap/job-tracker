import { describe, expect, it } from "vitest";
import { messages } from "@/lib/i18n/messages";
import type { MessageKey } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translate";

const en = createTranslator("en");
const uk = createTranslator("uk");

describe("createTranslator", () => {
  it("returns plain strings for each locale", () => {
    expect(en("common.cancel")).toBe("Cancel");
    expect(uk("common.cancel")).toBe("Скасувати");
  });

  it("interpolates named params", () => {
    expect(en("form.toasts.addedToApplied", { company: "Acme" })).toBe("Acme added to Applied");
  });

  it("leaves a placeholder untouched when its param is missing", () => {
    expect(en("form.toasts.addedToApplied")).toBe("{company} added to Applied");
  });

  it("picks English plural forms by count", () => {
    expect(en("nav.applicationsCount", { count: 1 })).toBe("1 application");
    expect(en("nav.applicationsCount", { count: 2 })).toBe("2 applications");
    expect(en("nav.applicationsCount", { count: 0 })).toBe("0 applications");
  });

  it("picks Ukrainian one, few and many forms", () => {
    expect(uk("nav.applicationsCount", { count: 1 })).toBe("1 відгук");
    expect(uk("nav.applicationsCount", { count: 2 })).toBe("2 відгуки");
    expect(uk("nav.applicationsCount", { count: 5 })).toBe("5 відгуків");
    expect(uk("nav.applicationsCount", { count: 11 })).toBe("11 відгуків");
    expect(uk("nav.applicationsCount", { count: 21 })).toBe("21 відгук");
    expect(uk("nav.applicationsCount", { count: 22 })).toBe("22 відгуки");
  });

  it("returns the key itself for an unknown key", () => {
    expect(en("nope.missing" as MessageKey)).toBe("nope.missing");
  });
});

function collectPaths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];

  const record = node as Record<string, unknown>;
  if (typeof record.one === "string" && typeof record.other === "string") return [prefix];

  return Object.entries(record).flatMap(([key, value]) =>
    collectPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

function readLeaf(tree: unknown, path: string): string | Record<string, string> {
  let node: unknown = tree;
  for (const segment of path.split(".")) {
    node = (node as Record<string, unknown>)[segment];
  }
  return node as string | Record<string, string>;
}

function tokens(leaf: string | Record<string, string>): string[] {
  const texts = typeof leaf === "string" ? [leaf] : Object.values(leaf);
  const found = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(/\{(\w+)\}|<(\w+)>/g)) {
      found.add(match[1] ?? `<${match[2]}>`);
    }
  }
  return [...found].sort();
}

describe("message dictionaries", () => {
  const enPaths = collectPaths(messages.en).sort();
  const ukPaths = collectPaths(messages.uk).sort();

  it("have exactly the same keys in English and Ukrainian", () => {
    expect(ukPaths).toEqual(enPaths);
  });

  it("use the same placeholders and tags in both locales", () => {
    for (const path of enPaths) {
      expect(tokens(readLeaf(messages.uk, path)), path).toEqual(tokens(readLeaf(messages.en, path)));
    }
  });

  it("provide every Ukrainian plural category for plural messages", () => {
    for (const path of ukPaths) {
      const leaf = readLeaf(messages.uk, path);
      if (typeof leaf === "string") continue;
      expect(Object.keys(leaf).sort(), path).toEqual(["few", "many", "one", "other"]);
    }
  });

  it("never leave a message empty", () => {
    for (const locale of ["en", "uk"] as const) {
      for (const path of collectPaths(messages[locale])) {
        const leaf = readLeaf(messages[locale], path);
        const texts = typeof leaf === "string" ? [leaf] : Object.values(leaf);
        for (const text of texts) {
          expect(text.trim().length, `${locale}:${path}`).toBeGreaterThan(0);
        }
      }
    }
  });
});
