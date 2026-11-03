import { prisma } from "@/lib/prisma";
import type { CoverLetterExampleDTO } from "@/lib/api-types";
import { ProfileInputError } from "@/lib/profile/errors";
import { COVER_LETTER_EXAMPLE_MAX_COUNT } from "@/lib/profile/limits";
import type { CreateExampleInput, UpdateExampleInput } from "@/lib/profile/schemas";

type ExampleRow = {
  id: string;
  vacancyText: string;
  letterText: string;
  createdAt: Date;
};

const EXAMPLE_SELECT = { id: true, vacancyText: true, letterText: true, createdAt: true } as const;

function toDTO(row: ExampleRow): CoverLetterExampleDTO {
  return {
    id: row.id,
    vacancyText: row.vacancyText,
    letterText: row.letterText,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listExamples(userId: string): Promise<CoverLetterExampleDTO[]> {
  const rows = await prisma.coverLetterExample.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: EXAMPLE_SELECT,
  });
  return rows.map(toDTO);
}

export async function createExample(userId: string, input: CreateExampleInput): Promise<CoverLetterExampleDTO> {
  const existing = await prisma.coverLetterExample.count({ where: { userId } });
  if (existing >= COVER_LETTER_EXAMPLE_MAX_COUNT) {
    throw new ProfileInputError("EXAMPLE_LIMIT");
  }

  const row = await prisma.coverLetterExample.create({
    data: { userId, vacancyText: input.vacancyText, letterText: input.letterText },
    select: EXAMPLE_SELECT,
  });
  return toDTO(row);
}

export async function updateExample(
  userId: string,
  id: string,
  input: UpdateExampleInput,
): Promise<CoverLetterExampleDTO | null> {
  const updated = await prisma.coverLetterExample.updateMany({ where: { id, userId }, data: input });
  if (updated.count === 0) return null;

  const row = await prisma.coverLetterExample.findFirst({ where: { id, userId }, select: EXAMPLE_SELECT });
  return row ? toDTO(row) : null;
}

export async function deleteExample(userId: string, id: string): Promise<boolean> {
  const deleted = await prisma.coverLetterExample.deleteMany({ where: { id, userId } });
  return deleted.count > 0;
}
