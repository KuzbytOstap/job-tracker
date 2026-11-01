"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAutoIgnoreSettings } from "@/hooks/use-auto-ignore-settings";
import { AUTO_IGNORE_AFTER_DAYS } from "@/lib/status";

const AutoIgnoreDaysContext = createContext<number>(AUTO_IGNORE_AFTER_DAYS);

export function AutoIgnoreDaysProvider({ children }: { children: ReactNode }) {
  const settings = useAutoIgnoreSettings();
  const days = settings.data?.autoIgnoreAfterDays ?? AUTO_IGNORE_AFTER_DAYS;

  return <AutoIgnoreDaysContext.Provider value={days}>{children}</AutoIgnoreDaysContext.Provider>;
}

export function useAutoIgnoreDays(): number {
  return useContext(AutoIgnoreDaysContext);
}
