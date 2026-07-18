// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { KanbanBoard } from "@/components/board/kanban-board";
import { BOARD_COLUMNS } from "@/lib/board-columns";
import type { ApplicationDTO } from "@/lib/api-types";
import { Status } from "@/app/generated/prisma/enums";

function fakeApplication(overrides: Partial<ApplicationDTO> = {}): ApplicationDTO {
  return {
    id: "app-1",
    company: "Acme",
    position: "Engineer",
    platform: "DIRECT",
    link: null,
    status: Status.APPLIED,
    hasTestTask: false,
    testTaskDone: false,
    salaryExpectation: null,
    notes: null,
    jobPostingText: null,
    coverLetterText: null,
    appliedAt: "2026-07-10T00:00:00.000Z",
    lastActivityAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    effectiveStatus: Status.APPLIED,
    isAutoIgnored: false,
    statusChanges: [],
    ...overrides,
  };
}

function renderBoard(applications: ApplicationDTO[]) {
  render(
    <DndContext>
      <KanbanBoard applications={applications} sort="newest" onSelectApplication={vi.fn()} />
    </DndContext>,
  );
}

afterEach(() => {
  cleanup();
});

describe("KanbanBoard", () => {
  it("renders every status column, even with no applications", () => {
    renderBoard([]);

    for (const column of BOARD_COLUMNS) {
      expect(screen.getByRole("region", { name: `${column.label} column` })).toBeInTheDocument();
    }
  });

  it("groups cards under their effective status column", () => {
    const applied = fakeApplication({ id: "app-applied", company: "Applied Co", effectiveStatus: Status.APPLIED });
    const offer = fakeApplication({ id: "app-offer", company: "Offer Co", effectiveStatus: Status.OFFER });
    renderBoard([applied, offer]);

    const appliedColumn = screen.getByRole("region", { name: "Applied column" });
    const offerColumn = screen.getByRole("region", { name: "Offer column" });

    expect(within(appliedColumn).getByText("Applied Co")).toBeInTheDocument();
    expect(within(appliedColumn).queryByText("Offer Co")).not.toBeInTheDocument();
    expect(within(offerColumn).getByText("Offer Co")).toBeInTheDocument();
    expect(within(offerColumn).queryByText("Applied Co")).not.toBeInTheDocument();
  });

  it("keeps an unoccupied column as a valid, empty drop target", () => {
    renderBoard([fakeApplication({ effectiveStatus: Status.APPLIED })]);

    const offerColumn = screen.getByRole("region", { name: "Offer column" });
    expect(offerColumn).toBeInTheDocument();
    expect(within(offerColumn).getByText("No offers yet — keep going.")).toBeInTheDocument();
  });
});
