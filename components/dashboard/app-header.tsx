"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  total: number | undefined;
  onAddClick: () => void;
};

export function AppHeader({ total, onAddClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">
            Job Tracker
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            Keep every opportunity moving
            {typeof total === "number" ? ` · ${total} application${total === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <Button onClick={onAddClick} className="hidden shrink-0 sm:inline-flex">
          <Plus data-icon="inline-start" />
          Add
        </Button>
      </div>
    </header>
  );
}
