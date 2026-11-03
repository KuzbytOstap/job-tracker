import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { CvDTO } from "@/lib/api-types";
import { invalidateContextItemWeights } from "@/lib/profile/context-items-service";
import { ProfileInputError } from "@/lib/profile/errors";
import { CV_MAX_BYTES, CV_MAX_COUNT } from "@/lib/profile/limits";

const CV_SELECT = {
  id: true,
  label: true,
  language: true,
  isPrimary: true,
  fileName: true,
  fileSize: true,
  extractedText: true,
  createdAt: true,
  updatedAt: true,
} as const;

type CvRow = Prisma.UserCvGetPayload<{ select: typeof CV_SELECT }>;

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d];

function toDTO(row: CvRow): CvDTO {
  return {
    id: row.id,
    label: row.label,
    language: row.language,
    isPrimary: row.isPrimary,
    fileName: row.fileName,
    fileSize: row.fileSize,
    hasText: row.extractedText !== null && row.extractedText.length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function validateCvFile(file: { size: number; bytes: Uint8Array }): void {
  if (file.size > CV_MAX_BYTES) {
    throw new ProfileInputError("CV_TOO_LARGE");
  }
  const looksLikePdf = PDF_MAGIC.every((byte, index) => file.bytes[index] === byte);
  if (!looksLikePdf) {
    throw new ProfileInputError("CV_NOT_PDF");
  }
}

export async function listCvs(userId: string): Promise<CvDTO[]> {
  const rows = await prisma.userCv.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: CV_SELECT,
  });
  return rows.map(toDTO);
}

export async function getCv(userId: string, cvId: string): Promise<CvDTO | null> {
  const row = await prisma.userCv.findFirst({ where: { id: cvId, userId }, select: CV_SELECT });
  return row ? toDTO(row) : null;
}

export async function createCv(
  userId: string,
  input: { label: string; language: string | null; fileName: string; bytes: Uint8Array },
): Promise<CvDTO> {
  validateCvFile({ size: input.bytes.byteLength, bytes: input.bytes });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.userCv.count({ where: { userId } });
    if (existing >= CV_MAX_COUNT) {
      throw new ProfileInputError("CV_LIMIT");
    }

    const row = await tx.userCv.create({
      data: {
        userId,
        label: input.label,
        language: input.language,
        fileName: input.fileName,
        fileSize: input.bytes.byteLength,
        fileData: new Uint8Array(input.bytes),
        isPrimary: existing === 0,
      },
      select: CV_SELECT,
    });
    return toDTO(row);
  });
}

export async function replaceCvFile(
  userId: string,
  cvId: string,
  input: { fileName: string; bytes: Uint8Array },
): Promise<CvDTO | null> {
  validateCvFile({ size: input.bytes.byteLength, bytes: input.bytes });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.userCv.findFirst({ where: { id: cvId, userId }, select: { isPrimary: true } });
    if (!existing) return null;

    const row = await tx.userCv.update({
      where: { id: cvId },
      data: {
        fileName: input.fileName,
        fileSize: input.bytes.byteLength,
        fileData: new Uint8Array(input.bytes),
        extractedText: null,
      },
      select: CV_SELECT,
    });
    if (existing.isPrimary) {
      await invalidateContextItemWeights(userId, tx);
    }
    return toDTO(row);
  });
}

export async function updateCvMeta(
  userId: string,
  cvId: string,
  input: { label?: string; language?: string | null; isPrimary?: true },
): Promise<CvDTO | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userCv.findFirst({ where: { id: cvId, userId }, select: { isPrimary: true } });
    if (!existing) return null;

    const data: Prisma.UserCvUpdateInput = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.language !== undefined) data.language = input.language;

    const promote = input.isPrimary === true && !existing.isPrimary;
    if (promote) {
      await tx.userCv.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
      data.isPrimary = true;
    }

    const row = await tx.userCv.update({ where: { id: cvId }, data, select: CV_SELECT });
    if (promote) {
      await invalidateContextItemWeights(userId, tx);
    }
    return toDTO(row);
  });
}

export async function deleteCv(userId: string, cvId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userCv.findFirst({ where: { id: cvId, userId }, select: { isPrimary: true } });
    if (!existing) return false;

    await tx.userCv.deleteMany({ where: { id: cvId, userId } });

    if (existing.isPrimary) {
      const next = await tx.userCv.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) {
        await tx.userCv.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
      await invalidateContextItemWeights(userId, tx);
    }
    return true;
  });
}

export async function setCvText(userId: string, cvId: string, text: string): Promise<CvDTO | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userCv.findFirst({ where: { id: cvId, userId }, select: { isPrimary: true } });
    if (!existing) return null;

    const row = await tx.userCv.update({ where: { id: cvId }, data: { extractedText: text }, select: CV_SELECT });
    if (existing.isPrimary) {
      await invalidateContextItemWeights(userId, tx);
    }
    return toDTO(row);
  });
}

export async function getCvFile(userId: string, cvId: string): Promise<{ fileName: string; bytes: Buffer } | null> {
  const row = await prisma.userCv.findFirst({
    where: { id: cvId, userId },
    select: { fileName: true, fileData: true },
  });
  return row ? { fileName: row.fileName, bytes: Buffer.from(row.fileData) } : null;
}

export type ResolvedCvText =
  | { status: "ok"; text: string }
  | { status: "missing"; reason: "CV_NOT_FOUND" | "NO_CV_TEXT" };

export async function resolveCvText(userId: string, cvId?: string): Promise<ResolvedCvText> {
  const row = await prisma.userCv.findFirst({
    where: cvId === undefined ? { userId, isPrimary: true } : { id: cvId, userId },
    select: { extractedText: true },
  });

  if (!row) {
    return { status: "missing", reason: cvId === undefined ? "NO_CV_TEXT" : "CV_NOT_FOUND" };
  }

  const text = row.extractedText?.trim();
  return text ? { status: "ok", text } : { status: "missing", reason: "NO_CV_TEXT" };
}

export async function getPrimaryCvText(userId: string): Promise<string | null> {
  const row = await prisma.userCv.findFirst({
    where: { userId, isPrimary: true },
    select: { extractedText: true },
  });
  return row?.extractedText ?? null;
}
