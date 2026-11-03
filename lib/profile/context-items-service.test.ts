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
  getContextItem,
  invalidateContextItemWeights,
  listContextItemScores,
  listContextItems,
  listSubstantialContextItems,
  listUnscoredContextItems,
  setContextItemScore,
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

describe("getContextItem", () => {
  it("reads one item scoped to the user", async () => {
    findFirstMock.mockResolvedValue(row({ weight: "MINOR" }));

    const item = await getContextItem("user_1", "item_1");

    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "item_1", userId: "user_1" } }));
    expect(item?.weight).toBe("MINOR");
  });

  it("returns null for another user's item", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(getContextItem("user_2", "item_1")).resolves.toBeNull();
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

describe("scoring helpers", () => {
  it("lists only the user's unscored items, newest first", async () => {
    findManyMock.mockResolvedValue([{ id: "a", text: "t" }]);

    await expect(listUnscoredContextItems("user_1")).resolves.toEqual([{ id: "a", text: "t" }]);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1", weight: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, text: true },
    });
  });

  it("writes a score only while the item is still unscored and its text is unchanged", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(
      setContextItemScore("user_1", "item_1", "Shipped passkeys", { weight: "SUBSTANTIAL", impact: 4 }),
    ).resolves.toBe(true);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "item_1", userId: "user_1", text: "Shipped passkeys", weight: null },
      data: { weight: "SUBSTANTIAL", impact: 4 },
    });
  });

  it("reports false when the item was edited, scored or removed in the meantime", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      setContextItemScore("user_1", "item_1", "old text", { weight: "MINOR", impact: null }),
    ).resolves.toBe(false);
  });

  it("lists weight, impact and creation time for the user's items without their text", async () => {
    findManyMock.mockResolvedValue([]);

    await listContextItemScores("user_1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      select: { weight: true, impact: true, createdAt: true },
    });
  });

  it("lists only the user's SUBSTANTIAL items", async () => {
    findManyMock.mockResolvedValue([]);

    await listSubstantialContextItems("user_1");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1", weight: "SUBSTANTIAL" } }),
    );
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
