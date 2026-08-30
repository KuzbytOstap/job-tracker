"use client";

import { LogOut, Plus } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type PipelineTopbarActionsProps = {
  onAddClick: () => void;
};

export function PipelineTopbarActions({ onAddClick }: PipelineTopbarActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        onClick={onAddClick}
        className="gh-console-cta transition-transform duration-100 motion-safe:active:scale-[0.96]"
      >
        <Plus data-icon="inline-start" />
        Add application
      </Button>
      <ThemeToggle />
      <Button
        type="button"
        variant="ghost"
        size="icon-touch"
        title="Sign out"
        aria-label="Sign out"
        onClick={() => signOut({ redirectTo: "/sign-in" })}
      >
        <LogOut />
      </Button>
    </div>
  );
}
