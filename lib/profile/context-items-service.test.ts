import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const createMock = vi.fn();
const updateManyMock = vi.fn();
const findFirstMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profileContextItem: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
    },
  },
}));

import {
  createContextItem,
  deleteContextItem,
  invalidateContextItemWeights,
  listContextItems,
  updateContextItem,
} from "@/lib/profile/context-items-service";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "item_1",
    text: "Shipped passkeys",
    weight: null,
    impact: null,
    createdAt: new Date("2026-11-03T10:00:00.000Z"),
    updatedAt: new Date("2026-11-03T10:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  findManyMock.mockReset();
  createMock.mockReset();
  updateManyMock.mockReset();
  findFirstMock.mockReset();
  deleteManyMock.mockReset();
});

describe("listContextItems", () => {
  it("lists only the user's items newest first with ISO dates", async () => {
    findManyMock.mockResolvedValue([row({ weight: "SUBSTANTIAL", impact: 4 })]);

    const result = await listContextItems("user_1");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" }, orderBy: { createdAt: "desc" } }),
    );
    expect(result).toEqual([
      {
        id: "item_1",
        text: "Shipped passkeys",
        weight: "SUBSTANTIAL",
        impact: 4,
        createdAt: "2026-11-03T10:00:00.000Z",
        updatedAt: "2026-11-03T10:00:00.000Z",
      },
    ]);
  });
});

describe("createContextItem", () => {
  it("creates an item for the user with null weight and impact", async () => {
    createMock.mockResolvedValue(row());

    const result = await createContextItem("user_1", { text: "Shipped passkeys" });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "user_1", text: "Shipped passkeys" } }),
    );
    expect(result.weight).toBeNull();
    expect(result.impact).toBeNull();
  });
});

describe("updateContextItem", () => {
  it("resets weight and impact when the text changes", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findFirstMock.mockResolvedValue(row({ text: "New text" }));

    const result = await updateContextItem("user_1", "item_1", { text: "New text" });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "item_1", userId: "user_1" },
      data: { text: "New text", weight: null, impact: null },
    });
    expect(result?.text).toBe("New text");
  });

  it("returns null for another user's item without reading it", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(updateContextItem("user_2", "item_1", { text: "x" })).resolves.toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});

describe("deleteContextItem", () => {
  it("deletes scoped by id and userId", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteContextItem("user_1", "item_1")).resolves.toBe(true);
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: "item_1", userId: "user_1" } });
  });

  it("returns false for another user's item", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });

    await expect(deleteContextItem("user_2", "item_1")).resolves.toBe(false);
  });
});

describe("invalidateContextItemWeights", () => {
  it("nulls weight and impact for the user's items only", async () => {
    updateManyMock.mockResolvedValue({ count: 3 });

    await invalidateContextItemWeights("user_1");

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { weight: null, impact: null },
    });
  });

  it("uses the transaction client when one is passed", async () => {
    const txUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { profileContextItem: { updateMany: txUpdateMany } };

    await invalidateContextItemWeights("user_1", tx as never);

    expect(txUpdateMany).toHaveBeenCalledWith({ where: { userId: "user_1" }, data: { weight: null, impact: null } });
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
