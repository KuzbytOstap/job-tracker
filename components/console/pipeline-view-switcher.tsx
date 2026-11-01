"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/components/i18n/i18n-provider";

export type ConsoleView = "board" | "table" | "funnel";

type PipelineViewSwitcherProps = {
  view: ConsoleView;
  onViewChange: (view: ConsoleView) => void;
};

export function PipelineViewSwitcher({ view, onViewChange }: PipelineViewSwitcherProps) {
  const t = useT();

  return (
    <Tabs value={view} onValueChange={(value) => onViewChange(value as ConsoleView)}>
      <TabsList aria-label={t("nav.boardViewLabel")}>
        <TabsTrigger value="board">{t("nav.board")}</TabsTrigger>
        <TabsTrigger value="table">{t("nav.table")}</TabsTrigger>
        <TabsTrigger value="funnel">{t("nav.funnel")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
