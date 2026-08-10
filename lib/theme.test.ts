// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, getInitialTheme, getStoredTheme, getSystemTheme, persistTheme } from "@/lib/theme";

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("dark") ? prefersDark : !prefersDark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
});

describe("getStoredTheme", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredTheme()).toBeNull();
  });

  it("returns the stored theme when valid", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getStoredTheme()).toBe("dark");
  });

  it("returns null for a corrupted stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(getStoredTheme()).toBeNull();
  });
});

describe("getSystemTheme", () => {
  it("reflects prefers-color-scheme: dark", () => {
    mockMatchMedia(true);
    expect(getSystemTheme()).toBe("dark");
  });

  it("reflects prefers-color-scheme: light", () => {
    mockMatchMedia(false);
    expect(getSystemTheme()).toBe("light");
  });
});

describe("getInitialTheme", () => {
  it("falls back to system theme when no preference is saved", () => {
    mockMatchMedia(true);
    expect(getInitialTheme()).toBe("dark");
  });

  it("prefers a saved dark theme over a light system preference", () => {
    mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getInitialTheme()).toBe("dark");
  });

  it("prefers a saved light theme over a dark system preference", () => {
    mockMatchMedia(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(getInitialTheme()).toBe("light");
  });
});

describe("persistTheme", () => {
  it("writes the theme to localStorage and to the document attribute", () => {
    persistTheme("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("survives being read back as the stored preference", () => {
    persistTheme("light");
    expect(getStoredTheme()).toBe("light");
  });
});
