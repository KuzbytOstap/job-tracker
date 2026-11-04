"use client";

import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/i18n-provider";

export function ProfileHeader() {
  const t = useT();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--gh-border)] bg-[var(--gh-surface)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            title={t("profile.backToBoard")}
            aria-label={t("profile.backToBoard")}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--gh-text-muted)] transition-colors hover:bg-[var(--gh-surface-secondary)] hover:text-[var(--gh-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-9"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-semibold tracking-tight text-[var(--gh-text)]">
              {t("profile.title")}
            </h1>
            <p className="truncate text-xs text-[var(--gh-text-muted)]">{t("profile.subtitle")}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-touch"
          title={t("nav.signOut")}
          aria-label={t("nav.signOut")}
          onClick={() => signOut({ redirectTo: "/sign-in" })}
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
