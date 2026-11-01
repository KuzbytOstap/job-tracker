"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import type { Locale } from "@/lib/i18n/locales";

type ProvidersProps = {
  locale: Locale;
  children: ReactNode;
};

function AppToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-center" richColors />;
}

export function Providers({ locale, children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              {children}
              <AppToaster />
            </TooltipProvider>
          </MotionConfig>
          {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
