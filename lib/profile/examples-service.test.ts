import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const countMock = vi.fn();
const createMock = vi.fn();
const updateManyMock = vi.fn();
const findFirstMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coverLetterExample: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      count: (...args: unknown[]) => countMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
    },
  },
}));

import { createExample, deleteExample, listExamples, updateExample } from "@/lib/profile/examples-service";
import { ProfileInputError } from "@/lib/profile/errors";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "ex_1",
    vacancyText: "React Native role",
    letterText: "Hi team",
    createdAt: new Date("2026-11-03T10:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  findManyMock.mockReset();
  countMock.mockReset();
  createMock.mockReset();
  updateManyMock.mockReset();
  findFirstMock.mockReset();
  deleteManyMock.mockReset();
});

describe("listExamples", () => {
  it("lists only the user's examples oldest first with ISO dates", async () => {
    findManyMock.mockResolvedValue([row()]);

    const result = await listExamples("user_1");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" }, orderBy: { createdAt: "asc" } }),
    );
    expect(result).toEqual([
      { id: "ex_1", vacancyText: "React Native role", letterText: "Hi team", createdAt: "2026-11-03T10:00:00.000Z" },
    ]);
  });
});

describe("createExample", () => {
  it("creates an example for the user while under the limit", async () => {
    countMock.mockResolvedValue(2);
    createMock.mockResolvedValue(row());

    await createExample("user_1", { vacancyText: "v", letterText: "l" });

    expect(countMock).toHaveBeenCalledWith({ where: { userId: "user_1" } });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "user_1", vacancyText: "v", letterText: "l" } }),
    );
  });

  it("rejects the 4th example with EXAMPLE_LIMIT and stores nothing", async () => {
    countMock.mockResolvedValue(3);

    await expect(createExample("user_1", { vacancyText: "v", letterText: "l" })).rejects.toMatchObject({
      code: "EXAMPLE_LIMIT",
    });
    await expect(createExample("user_1", { vacancyText: "v", letterText: "l" })).rejects.toBeInstanceOf(
      ProfileInputError,
    );
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("updateExample", () => {
  it("updates scoped by id and userId and returns the fresh row", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findFirstMock.mockResolvedValue(row({ letterText: "New letter" }));

    const result = await updateExample("user_1", "ex_1", { letterText: "New letter" });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "ex_1", userId: "user_1" },
      data: { letterText: "New letter" },
    });
    expect(result?.letterText).toBe("New letter");
  });

  it("returns null for another user's example without reading it", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    const result = await updateExample("user_2", "ex_1", { letterText: "x" });

    expect(result).toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});

describe("deleteExample", () => {
  it("deletes scoped by id and userId", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteExample("user_1", "ex_1")).resolves.toBe(true);
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: "ex_1", userId: "user_1" } });
  });

  it("returns false for another user's example", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });

    await expect(deleteExample("user_2", "ex_1")).resolves.toBe(false);
  });
});
