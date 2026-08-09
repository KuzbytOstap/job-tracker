import type { AiGlobalLimits } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getAiGlobalLimits(): Promise<AiGlobalLimits> {
  return prisma.aiGlobalLimits.upsert({ where: { id: 1 }, create: {}, update: {} });
}

export type AiGlobalLimitsInput = {
  vacancyGenerationLimit?: number;
  hrGenerationLimit?: number;
  tokenLimit?: number;
};

/**
 * Updates only the fields provided; anything omitted keeps its current
 * value on `update`, or its schema default (10/10/20000) if the singleton
 * row doesn't exist yet on `create`.
 */
export async function updateAiGlobalLimits(input: AiGlobalLimitsInput): Promise<AiGlobalLimits> {
  return prisma.aiGlobalLimits.upsert({
    where: { id: 1 },
    create: { id: 1, ...input },
    update: input,
  });
}
