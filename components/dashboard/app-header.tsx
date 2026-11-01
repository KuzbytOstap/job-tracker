"use client";

import Link from "next/link";
import { LogOut, Plus, ShieldCheck } from "lucide-react";
import { signOut } from "next-auth/react";
import { motion } from "motion/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  total: number | undefined;
  onAddClick: () => void;
  playEntrance?: boolean;
  isAdmin?: boolean;
  className?: string;
  titleAsHeading?: boolean;
};

export function AppHeader({
  total,
  onAddClick,
  playEntrance = false,
  isAdmin = false,
  className,
  titleAsHeading = true,
}: AppHeaderProps) {
  const t = useT();
  const TitleTag = titleAsHeading ? "h1" : "p";

  return (
    <motion.header
      initial={playEntrance ? { opacity: 0, y: -10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md sm:border-[var(--gh-border)] sm:bg-[var(--gh-surface)]/80",
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-2.5">
        <div className="min-w-0">
          <TitleTag className="font-heading text-lg font-semibold tracking-tight sm:text-base sm:text-[var(--gh-text)]">
            {t("common.appName")}
          </TitleTag>
          <p className="truncate text-sm text-muted-foreground sm:text-xs sm:text-[var(--gh-text-muted)]">
            {t("dashboard.header.tagline")}
            {typeof total === "number" ? ` · ${t("nav.applicationsCount", { count: total })}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            onClick={onAddClick}
            className="hidden transition-transform duration-100 motion-safe:active:scale-[0.96] sm:inline-flex"
          >
            <Plus data-icon="inline-start" />
            {t("dashboard.header.add")}
          </Button>
          {isAdmin && (
            <Link
              href="/admin"
              title={t("nav.admin")}
              aria-label={t("nav.admin")}
              className={buttonVariants({ variant: "ghost", size: "icon-touch" })}
            >
              <ShieldCheck />
            </Link>
          )}
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon-touch"
            title={t("nav.signOut")}
            aria-label={t("nav.signOut")}
            onClick={() => signOut({ redirectTo: "/sign-in" })}
            className="transition-transform duration-100 motion-safe:active:scale-[0.94]"
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
