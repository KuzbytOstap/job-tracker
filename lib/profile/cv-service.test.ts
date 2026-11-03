import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const userCv = {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  };
  return { userCv, tx: { userCv }, invalidate: vi.fn() };
});

const findManyMock = mocks.userCv.findMany;
const countMock = mocks.userCv.count;
const createMock = mocks.userCv.create;
const updateMock = mocks.userCv.update;
const updateManyMock = mocks.userCv.updateMany;
const findFirstMock = mocks.userCv.findFirst;
const deleteManyMock = mocks.userCv.deleteMany;
const invalidateMock = mocks.invalidate;
const txClient = mocks.tx;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userCv: mocks.userCv,
    $transaction: (callback: (tx: unknown) => unknown) => callback(mocks.tx),
  },
}));

vi.mock("@/lib/profile/context-items-service", () => ({
  invalidateContextItemWeights: (...args: unknown[]) => mocks.invalidate(...args),
}));

import {
  createCv,
  deleteCv,
  getCv,
  getCvFile,
  getPrimaryCvText,
  listCvs,
  replaceCvFile,
  setCvText,
  updateCvMeta,
  validateCvFile,
} from "@/lib/profile/cv-service";
import { CV_MAX_BYTES } from "@/lib/profile/limits";

function pdfBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
  return bytes;
}

function cvRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cv_1",
    label: "React Native",
    language: "en",
    isPrimary: true,
    fileName: "cv.pdf",
    fileSize: 64,
    extractedText: null,
    createdAt: new Date("2026-11-03T10:00:00.000Z"),
    updatedAt: new Date("2026-11-03T10:00:00.000Z"),
    ...overrides,
  };
}

const NEW_CV = { label: "Frontend", language: null, fileName: "cv2.pdf" };

beforeEach(() => {
  findManyMock.mockReset();
  countMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  updateManyMock.mockReset();
  findFirstMock.mockReset();
  deleteManyMock.mockReset();
  invalidateMock.mockReset();
});

describe("validateCvFile", () => {
  it("rejects non PDF bytes even when the file is named .pdf", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => validateCvFile({ size: png.byteLength, bytes: png })).toThrow(
      expect.objectContaining({ code: "CV_NOT_PDF" }),
    );
  });

  it("rejects an empty file", () => {
    expect(() => validateCvFile({ size: 0, bytes: new Uint8Array(0) })).toThrow(
      expect.objectContaining({ code: "CV_NOT_PDF" }),
    );
  });

  it("rejects a file of 4 MB plus one byte", () => {
    expect(() => validateCvFile({ size: CV_MAX_BYTES + 1, bytes: pdfBytes() })).toThrow(
      expect.objectContaining({ code: "CV_TOO_LARGE" }),
    );
  });

  it("accepts exactly 4 MB", () => {
    expect(() => validateCvFile({ size: CV_MAX_BYTES, bytes: pdfBytes() })).not.toThrow();
  });
});

describe("listCvs", () => {
  it("never selects fileData and orders primary first then newest", async () => {
    findManyMock.mockResolvedValue([cvRow({ extractedText: "text" })]);

    const result = await listCvs("user_1");

    const args = findManyMock.mock.calls[0][0] as { where: unknown; orderBy: unknown; select: Record<string, boolean> };
    expect(args.where).toEqual({ userId: "user_1" });
    expect(args.orderBy).toEqual([{ isPrimary: "desc" }, { createdAt: "desc" }]);
    expect(Object.keys(args.select)).not.toContain("fileData");
    expect(result[0].hasText).toBe(true);
    expect(result[0]).not.toHaveProperty("extractedText");
  });

  it("reports hasText false when no text has been stored", async () => {
    findManyMock.mockResolvedValue([cvRow({ extractedText: null })]);

    expect((await listCvs("user_1"))[0].hasText).toBe(false);
  });
});

describe("createCv", () => {
  it("makes the first CV primary", async () => {
    countMock.mockResolvedValue(0);
    createMock.mockResolvedValue(cvRow());

    await createCv("user_1", { ...NEW_CV, bytes: pdfBytes() });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user_1", isPrimary: true, fileSize: 64 }) }),
    );
  });

  it("does not make later CVs primary", async () => {
    countMock.mockResolvedValue(2);
    createMock.mockResolvedValue(cvRow({ isPrimary: false }));

    await createCv("user_1", { ...NEW_CV, bytes: pdfBytes() });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPrimary: false }) }),
    );
  });

  it("throws CV_LIMIT on the 6th CV and stores nothing", async () => {
    countMock.mockResolvedValue(5);

    await expect(createCv("user_1", { ...NEW_CV, bytes: pdfBytes() })).rejects.toMatchObject({ code: "CV_LIMIT" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects a non PDF before touching the database", async () => {
    await expect(
      createCv("user_1", { ...NEW_CV, bytes: new Uint8Array([1, 2, 3, 4, 5, 6]) }),
    ).rejects.toMatchObject({ code: "CV_NOT_PDF" });
    expect(countMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("replaceCvFile", () => {
  it("clears the stored text and invalidates weights when the primary CV changes", async () => {
    findFirstMock.mockResolvedValue({ isPrimary: true });
    updateMock.mockResolvedValue(cvRow());

    await replaceCvFile("user_1", "cv_1", { fileName: "new.pdf", bytes: pdfBytes() });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cv_1" },
        data: expect.objectContaining({ fileName: "new.pdf", extractedText: null }),
      }),
    );
    expect(invalidateMock).toHaveBeenCalledWith("user_1", txClient);
  });

  it("does not invalidate weights when a non primary CV is replaced", async () => {
    findFirstMock.mockResolvedValue({ isPrimary: false });
    updateMock.mockResolvedValue(cvRow({ isPrimary: false }));

    await replaceCvFile("user_1", "cv_2", { fileName: "new.pdf", bytes: pdfBytes() });

    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("returns null for another user's CV and writes nothing", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(replaceCvFile("user_2", "cv_1", { fileName: "n.pdf", bytes: pdfBytes() })).resolves.toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("validates the new file before any lookup", async () => {
    await expect(
      replaceCvFile("user_1", "cv_1", { fileName: "n.pdf", bytes: new Uint8Array([1, 2, 3]) }),
    ).rejects.toMatchObject({ code: "CV_NOT_PDF" });
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});

describe("updateCvMeta", () => {
  it("demotes the old primary before promoting, then invalidates weights", async () => {
    findFirstMock.mockResolvedValue({ isPrimary: false });
    updateManyMock.mockResolvedValue({ count: 1 });
    updateMock.mockResolvedValue(cvRow({ id: "cv_2" }));

    await updateCvMeta("user_1", "cv_2", { isPrimary: true });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1", isPrimary: true },
      data: { isPrimary: false },
    });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cv_2" }, data: { isPrimary: true } }),
    );
    expect(updateManyMock.mock.invocationCallOrder[0]).toBeLessThan(updateMock.mock.invocationCallOrder[0]);
    expect(invalidateMock).toHaveBeenCalledWith("user_1", txClient);
  });

  it("renaming does not touch primary or weights", async () => {
    findFirstMock.mockResolvedValue({ isPrimary: true });
    updateMock.mockResolvedValue(cvRow({ label: "Mobile" }));

    await updateCvMeta("user_1", "cv_1", { label: "Mobile" });

    expect(updateManyMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ data: { label: "Mobile" } }));
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("promoting a CV that is already primary changes nothing and keeps weights", async () => {
    findFirstMock.mockResolvedValue({ isPrimary: true });
    updateMock.mockResolvedValue(cvRow());

    await updateCvMeta("user_1", "cv_1", { isPrimary: true });

    expect(updateManyMock).not.toHaveBeenCalled();
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("returns null for another user's CV", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(updateCvMeta("user_2", "cv_1", { isPrimary: true })).resolves.toBeNull();
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("deleteCv", () => {
  it("promotes the most recently created remaining CV when the primary is deleted", async () => {
    findFirstMock.mockResolvedValueOnce({ isPrimary: true }).mockResolvedValueOnce({ id: "cv_3" });
    deleteManyMock.mockResolvedValue({ count: 1 });
    updateMock.mockResolvedValue(cvRow({ id: "cv_3" }));

    await expect(deleteCv("user_1", "cv_1")).resolves.toBe(true);

    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: "cv_1", userId: "user_1" } });
    expect(findFirstMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userId: "user_1" }, orderBy: { createdAt: "desc" } }),
    );
    expect(updateMock).toHaveBeenCalledWith({ where: { id: "cv_3" }, data: { isPrimary: true } });
    expect(invalidateMock).toHaveBeenCalledWith("user_1", txClient);
  });

  it("invalidates weights and leaves no primary when the last CV is deleted", async () => {
    findFirstMock.mockResolvedValueOnce({ isPrimary: true }).mockResolvedValueOnce(null);
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteCv("user_1", "cv_1")).resolves.toBe(true);

    expect(updateMock).not.toHaveBeenCalled();
    expect(invalidateMock).toHaveBeenCalledWith("user_1", txClient);
  });

  it("keeps weights and the primary when a non primary CV is deleted", async () => {
    findFirstMock.mockResolvedValue({ isPrimary: false });
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteCv("user_1", "cv_2")).resolves.toBe(true);

    expect(updateMock).not.toHaveBeenCalled();
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("returns false for another user's CV and deletes nothing", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(deleteCv("user_2", "cv_1")).resolves.toBe(false);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });
});

describe("setCvText", () => {
  it("stores the text and invalidates weights for the primary CV", async () => {
    findFirstMock.mockResolvedValue({ isPrimary: true });
    updateMock.mockResolvedValue(cvRow({ extractedText: "CV text" }));

    const result = await setCvText("user_1", "cv_1", "CV text");

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cv_1" }, data: { extractedText: "CV text" } }),
    );
    expect(result?.hasText).toBe(true);
    expect(invalidateMock).toHaveBeenCalledWith("user_1", txClient);
  });

  it("does not invalidate weights for a non primary CV", async () => {
    findFirstMock.mockResolvedValue({ isPrimary: false });
    updateMock.mockResolvedValue(cvRow({ isPrimary: false, extractedText: "t" }));

    await setCvText("user_1", "cv_2", "t");

    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("returns null for another user's CV", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(setCvText("user_2", "cv_1", "t")).resolves.toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("getCv", () => {
  it("returns the owner's CV without file bytes", async () => {
    findFirstMock.mockResolvedValue(cvRow());

    const cv = await getCv("user_1", "cv_1");

    const args = findFirstMock.mock.calls[0][0] as { where: unknown; select: Record<string, boolean> };
    expect(args.where).toEqual({ id: "cv_1", userId: "user_1" });
    expect(Object.keys(args.select)).not.toContain("fileData");
    expect(cv?.id).toBe("cv_1");
  });

  it("returns null for another user's CV", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(getCv("user_2", "cv_1")).resolves.toBeNull();
  });
});

describe("getCvFile", () => {
  it("returns the file name and bytes for the owner", async () => {
    findFirstMock.mockResolvedValue({ fileName: "cv.pdf", fileData: pdfBytes(8) });

    const file = await getCvFile("user_1", "cv_1");

    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "cv_1", userId: "user_1" } }));
    expect(file?.fileName).toBe("cv.pdf");
    expect(Buffer.isBuffer(file?.bytes)).toBe(true);
    expect(file?.bytes.byteLength).toBe(8);
  });

  it("returns null for another user's CV", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(getCvFile("user_2", "cv_1")).resolves.toBeNull();
  });
});

describe("getPrimaryCvText", () => {
  it("returns the primary CV's text", async () => {
    findFirstMock.mockResolvedValue({ extractedText: "CV text" });

    await expect(getPrimaryCvText("user_1")).resolves.toBe("CV text");
    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user_1", isPrimary: true } }));
  });

  it("returns null when there is no primary CV or no text yet", async () => {
    findFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ extractedText: null });

    await expect(getPrimaryCvText("user_1")).resolves.toBeNull();
    await expect(getPrimaryCvText("user_1")).resolves.toBeNull();
  });
});
