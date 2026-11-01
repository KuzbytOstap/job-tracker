"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n/i18n-provider";
import { SORT_OPTIONS } from "@/lib/labels";
import { SORT_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/lib/validation";

type DashboardControlsProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  visualVariant?: "default" | "gameHub";
};

export function DashboardControls({
  search,
  onSearchChange,
  sort,
  onSortChange,
  visualVariant = "default",
}: DashboardControlsProps) {
  const t = useT();
  const isGameHub = visualVariant === "gameHub";
  const sortItems = SORT_OPTIONS.map((option) => ({ value: option, label: t(SORT_LABEL_KEYS[option]) }));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("dashboard.controls.searchPlaceholder")}
          aria-label={t("dashboard.controls.searchLabel")}
          className={cn("pl-8", isGameHub && "gh-list-control-input")}
        />
        {search.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onSearchChange("")}
            aria-label={t("dashboard.controls.clearSearch")}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          >
            <X />
          </Button>
        )}
      </div>
      <Select
        value={sort}
        items={sortItems}
        onValueChange={(nextValue) => onSortChange(nextValue as SortOption)}
      >
        <SelectTrigger
          className={cn("w-full sm:w-44", isGameHub && "gh-list-control-input")}
          aria-label={t("dashboard.controls.sortLabel")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortItems.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
