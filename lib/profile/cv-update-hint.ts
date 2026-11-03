import type { CvSuggestionDTO, CvUpdateHintDTO } from "@/lib/api-types";
import { getCvHintSnoozedAt, setCvHintSnoozedAt } from "@/lib/profile/profile-service";
import { getPrimaryCvText } from "@/lib/profile/cv-service";
import { listContextItemScores, listSubstantialContextItems } from "@/lib/profile/context-items-service";
import {
  CV_HINT_IMPACT_SUM_THRESHOLD,
  CV_HINT_SINGLE_ITEM_IMPACT,
  CV_HINT_SNOOZE_DAYS,
} from "@/lib/profile/limits";
import { runProfileOperation, type ProfileAiSkipReason } from "@/lib/profile/run-profile-ai";

const DAY_MS = 24 * 60 * 60 * 1000;

type ScoredItem = { weight: string | null; impact: number | null; createdAt: Date };

export function evaluateCvUpdateHint(input: {
  items: ScoredItem[];
  snoozedAt: Date | null;
  now: Date;
}): CvUpdateHintDTO {
  const substantial = input.items.filter(
    (item): item is ScoredItem & { impact: number } => item.weight === "SUBSTANTIAL" && item.impact !== null,
  );
  const impactSum = substantial.reduce((sum, item) => sum + item.impact, 0);
  const qualifies =
    impactSum >= CV_HINT_IMPACT_SUM_THRESHOLD || substantial.some((item) => item.impact >= CV_HINT_SINGLE_ITEM_IMPACT);

  const { snoozedAt, now } = input;
  const snoozed =
    snoozedAt !== null &&
    now.getTime() < snoozedAt.getTime() + CV_HINT_SNOOZE_DAYS * DAY_MS &&
    !substantial.some((item) => item.createdAt.getTime() > snoozedAt.getTime());

  return { visible: qualifies && !snoozed, substantialCount: substantial.length, snoozed };
}

export async function getCvUpdateHint(userId: string, now: Date = new Date()): Promise<CvUpdateHintDTO> {
  const [items, snoozedAt] = await Promise.all([listContextItemScores(userId), getCvHintSnoozedAt(userId)]);
  return evaluateCvUpdateHint({ items, snoozedAt, now });
}

export async function snoozeCvUpdateHint(userId: string, now: Date = new Date()): Promise<CvUpdateHintDTO> {
  await setCvHintSnoozedAt(userId, now);
  return getCvUpdateHint(userId, now);
}

export type CvSuggestionsOutcome =
  | { status: "ok"; suggestions: CvSuggestionDTO[] }
  | { status: "skipped"; reason: ProfileAiSkipReason };

export async function suggestCvUpdates(userId: string): Promise<CvSuggestionsOutcome> {
  const items = await listSubstantialContextItems(userId);
  if (items.length === 0) {
    return { status: "ok", suggestions: [] };
  }

  const cvText = await getPrimaryCvText(userId);
  if (!cvText) {
    return { status: "skipped", reason: "NO_CV_TEXT" };
  }

  const outcome = await runProfileOperation({
    userId,
    select: (provider) => provider.suggestCvUpdates,
    input: { cvText, items },
  });
  if (!outcome.ok) {
    return { status: "skipped", reason: outcome.reason };
  }

  const knownIds = new Set(items.map((item) => item.id));
  return {
    status: "ok",
    suggestions: outcome.result.suggestions.filter((suggestion) => knownIds.has(suggestion.itemId)),
  };
}
