import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ContextItemDTO } from "@/lib/api-types";
import type { ContextItemInput } from "@/lib/profile/schemas";

const ITEM_SELECT = {
  id: true,
  text: true,
  weight: true,
  impact: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ItemRow = Prisma.ProfileContextItemGetPayload<{ select: typeof ITEM_SELECT }>;

function toDTO(row: ItemRow): ContextItemDTO {
  return {
    id: row.id,
    text: row.text,
    weight: row.weight,
    impact: row.impact,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listContextItems(userId: string): Promise<ContextItemDTO[]> {
  const rows = await prisma.profileContextItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: ITEM_SELECT,
  });
  return rows.map(toDTO);
}

export async function createContextItem(userId: string, input: ContextItemInput): Promise<ContextItemDTO> {
  const row = await prisma.profileContextItem.create({
    data: { userId, text: input.text },
    select: ITEM_SELECT,
  });
  return toDTO(row);
}

export async function updateContextItem(
  userId: string,
  id: string,
  input: ContextItemInput,
): Promise<ContextItemDTO | null> {
  const updated = await prisma.profileContextItem.updateMany({
    where: { id, userId },
    data: { text: input.text, weight: null, impact: null },
  });
  if (updated.count === 0) return null;

  const row = await prisma.profileContextItem.findFirst({ where: { id, userId }, select: ITEM_SELECT });
  return row ? toDTO(row) : null;
}

export async function deleteContextItem(userId: string, id: string): Promise<boolean> {
  const deleted = await prisma.profileContextItem.deleteMany({ where: { id, userId } });
  return deleted.count > 0;
}

export async function invalidateContextItemWeights(
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db: Prisma.TransactionClient = tx ?? prisma;
  await db.profileContextItem.updateMany({ where: { userId }, data: { weight: null, impact: null } });
}
