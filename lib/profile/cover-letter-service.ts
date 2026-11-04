import { AiFeature } from "@/app/generated/prisma/client";
import { listContextItems } from "@/lib/profile/context-items-service";
import { resolveCvText } from "@/lib/profile/cv-service";
import { DEFAULT_COVER_LETTER_PROMPT } from "@/lib/profile/default-cover-letter-prompt";
import { listExamples } from "@/lib/profile/examples-service";
import { getProfile } from "@/lib/profile/profile-service";
import { runProfileOperation, type ProfileAiSkipReason } from "@/lib/profile/run-profile-ai";

export type CoverLetterRequest = {
  vacancyText: string;
  company: string | null;
  position: string | null;
  cvId?: string;
};

export type CoverLetterOutcome =
  | { status: "ok"; letter: string }
  | { status: "skipped"; reason: ProfileAiSkipReason };

function signatureOf(firstName: string | null, lastName: string | null): string | null {
  const name = [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
}

export async function generateCoverLetter(userId: string, request: CoverLetterRequest): Promise<CoverLetterOutcome> {
  const cv = await resolveCvText(userId, request.cvId);
  if (cv.status === "missing") {
    return { status: "skipped", reason: cv.reason };
  }

  const [profile, contextItems, examples] = await Promise.all([
    getProfile(userId),
    listContextItems(userId),
    listExamples(userId),
  ]);

  const outcome = await runProfileOperation({
    userId,
    feature: AiFeature.COVER_LETTER,
    select: (provider) => provider.generateCoverLetter,
    input: {
      basePrompt: profile.coverLetterPrompt?.trim() ? profile.coverLetterPrompt : DEFAULT_COVER_LETTER_PROMPT,
      cvText: cv.text,
      contextItems: contextItems.map((item) => item.text),
      examples: examples.map(({ vacancyText, letterText }) => ({ vacancyText, letterText })),
      signatureName: signatureOf(profile.firstName, profile.lastName),
      vacancyText: request.vacancyText,
      company: request.company,
      position: request.position,
    },
  });

  if (!outcome.ok) {
    return { status: "skipped", reason: outcome.reason };
  }
  return { status: "ok", letter: outcome.result.letter };
}
