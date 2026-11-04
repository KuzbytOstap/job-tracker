import type { ContextItemSaveResultDTO, ContextScoringDTO } from "@/lib/api-types";
import { scorePendingContextItems } from "@/lib/profile/context-scoring-service";
import { getContextItem } from "@/lib/profile/context-items-service";
import { CONTEXT_SCORE_BATCH_SIZE } from "@/lib/profile/limits";

export async function scoreAfterSave(userId: string, itemId: string): Promise<ContextItemSaveResultDTO | null> {
  let scoring: ContextScoringDTO;
  try {
    scoring = await scorePendingContextItems(userId, { limit: CONTEXT_SCORE_BATCH_SIZE });
  } catch (error) {
    console.error("[profile] scoring after save failed", error instanceof Error ? error.name : "unknown");
    scoring = { scored: 0, remaining: 0, skipped: "PROVIDER_FAILED" };
  }

  const item = await getContextItem(userId, itemId);
  return item ? { item, scoring } : null;
}
