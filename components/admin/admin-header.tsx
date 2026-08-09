"use client";

import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.header
      initial={reducedMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-30 border-b border-[var(--gh-border)] bg-[var(--gh-surface)]/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            title="Back to board"
            aria-label="Back to board"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--gh-text-muted)] transition-colors hover:bg-[var(--gh-surface-secondary)] hover:text-[var(--gh-text)]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-semibold tracking-tight text-[var(--gh-text)]">
              Admin
            </h1>
            <p className="truncate text-xs text-[var(--gh-text-muted)]">AI access &amp; quota management</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => signOut({ redirectTo: "/sign-in" })}
          className="transition-transform duration-100 motion-safe:active:scale-[0.94]"
        >
          <LogOut />
        </Button>
      </div>
    </motion.header>
  );
}
