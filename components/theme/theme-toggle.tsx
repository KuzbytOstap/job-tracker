"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-touch"
      title={label}
      aria-label={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="transition-transform duration-100 motion-safe:active:scale-[0.94]"
    >
      {isDark ? <Moon /> : <Sun />}
    </Button>
  );
}
