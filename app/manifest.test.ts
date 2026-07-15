import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "@/app/manifest";

const PUBLIC_DIR = join(process.cwd(), "public");

describe("web app manifest", () => {
  const result = manifest();

  it("identifies the app", () => {
    expect(result.name).toBe("Job Tracker");
    expect(result.short_name).toBe("Job Tracker");
    expect(result.description).toBeTruthy();
  });

  it("scopes the app to the root without claiming offline support", () => {
    expect(result.start_url).toBe("/");
    expect(result.scope).toBe("/");
    expect(result.display).toBe("standalone");
  });

  it("declares light background and theme colors", () => {
    expect(result.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("declares at least a 192x192 and a 512x512 icon", () => {
    const sizes = (result.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("has no duplicate icon declarations", () => {
    const keys = (result.icons ?? []).map((icon) => `${icon.src}:${icon.sizes}:${icon.purpose ?? ""}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("only declares supported icon purposes", () => {
    const supportedPurposes = new Set(["any", "maskable", "monochrome"]);
    for (const icon of result.icons ?? []) {
      if (icon.purpose) {
        expect(supportedPurposes.has(icon.purpose)).toBe(true);
      }
    }
  });

  it("references icon files that exist under public/", () => {
    for (const icon of result.icons ?? []) {
      const relativePath = icon.src.replace(/^\//, "");
      expect(existsSync(join(PUBLIC_DIR, relativePath))).toBe(true);
    }
  });
});
