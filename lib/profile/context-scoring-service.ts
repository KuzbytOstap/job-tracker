import { getPrimaryCvText } from "@/lib/profile/cv-service";
import { listUnscoredContextItems, setContextItemScore } from "@/lib/profile/context-items-service";
import { runProfileOperation, type ProfileAiSkipReason } from "@/lib/profile/run-profile-ai";

export type ScorePendingResult = {
  scored: number;
  remaining: number;
  skipped: ProfileAiSkipReason | null;
};

export async function scorePendingContextItems(
  userId: string,
  options: { limit: number },
): Promise<ScorePendingResult> {
  const pending = await listUnscoredContextItems(userId);
  if (pending.length === 0) {
    return { scored: 0, remaining: 0, skipped: null };
  }

  const cvText = await getPrimaryCvText(userId);
  if (!cvText) {
    return { scored: 0, remaining: pending.length, skipped: "NO_CV_TEXT" };
  }

  let scored = 0;
  for (const item of pending.slice(0, options.limit)) {
    const outcome = await runProfileOperation({
      userId,
      select: (provider) => provider.scoreContextItem,
      input: { cvText, itemText: item.text },
    });
    if (!outcome.ok) {
      return { scored, remaining: pending.length - scored, skipped: outcome.reason };
    }

    const written = await setContextItemScore(userId, item.id, item.text, outcome.result);
    if (written) scored += 1;
  }

  return { scored, remaining: pending.length - scored, skipped: null };
}
