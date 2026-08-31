"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ConsoleView = "board" | "table" | "funnel";

type PipelineViewSwitcherProps = {
  view: ConsoleView;
  onViewChange: (view: ConsoleView) => void;
};

export function PipelineViewSwitcher({ view, onViewChange }: PipelineViewSwitcherProps) {
  return (
    <Tabs value={view} onValueChange={(value) => onViewChange(value as ConsoleView)}>
      <TabsList aria-label="Board view">
        <TabsTrigger value="board">Board</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
        <TabsTrigger value="funnel">Funnel</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
