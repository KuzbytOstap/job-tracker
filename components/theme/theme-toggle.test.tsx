// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

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

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
});

describe("ThemeToggle", () => {
  it("follows the system theme when no preference is saved", async () => {
    mockMatchMedia(true);
    renderToggle();

    expect(await screen.findByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("overrides a dark system preference with a saved light preference", async () => {
    mockMatchMedia(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    renderToggle();

    expect(await screen.findByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("overrides a light system preference with a saved dark preference", async () => {
    mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    renderToggle();

    expect(await screen.findByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("updates the active theme immediately when toggled", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    renderToggle();

    const button = await screen.findByRole("button", { name: "Switch to dark theme" });
    await user.click(button);

    expect(await screen.findByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("persists the chosen preference to localStorage", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    renderToggle();

    const button = await screen.findByRole("button", { name: "Switch to dark theme" });
    await user.click(button);

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("keeps the persisted preference across a new mount, simulating a reload", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    const { unmount } = renderToggle();

    const button = await screen.findByRole("button", { name: "Switch to dark theme" });
    await user.click(button);
    unmount();
    cleanup();
    document.documentElement.removeAttribute("data-theme");

    renderToggle();
    expect(await screen.findByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });
});
