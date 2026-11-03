import { AiFeature } from "@/app/generated/prisma/client";
import {
  AiAccessError,
  requireAiAccessApproved,
  runGatedAiCall,
  type AiAccessErrorCode,
} from "@/lib/ai/access-control";
import { getProfileProvider } from "@/lib/ai/get-profile-provider";
import { ProfileAiProviderError, type ProfileAiOperation, type ProfileAiProvider } from "@/lib/ai/profile-provider";

export type ProfileAiSkipReason = AiAccessErrorCode | "PROVIDER_FAILED" | "NO_CV_TEXT" | "CV_NOT_FOUND";

export type ProfileAiOutcome<O> = { ok: true; result: O } | { ok: false; reason: ProfileAiSkipReason };

export async function runProfileOperation<I, O>(params: {
  userId: string;
  select: (provider: ProfileAiProvider) => ProfileAiOperation<I, O>;
  input: I;
}): Promise<ProfileAiOutcome<O>> {
  const { userId, select, input } = params;

  try {
    const provider = getProfileProvider();
    const operation = select(provider);

    if (provider.name === "mock") {
      await requireAiAccessApproved(userId);
      return { ok: true, result: await operation.run(input) };
    }

    const result = await runGatedAiCall({
      userId,
      feature: AiFeature.PROFILE,
      maxOutputTokens: operation.maxOutputTokens,
      countInputTokens: () => operation.countInputTokens(input),
      call: (reportUsage) => operation.run(input, { onUsage: reportUsage }),
    });
    return { ok: true, result };
  } catch (error) {
    if (error instanceof AiAccessError) {
      return { ok: false, reason: error.code };
    }

    const kind = error instanceof ProfileAiProviderError ? error.kind : "unknown";
    console.error("[profile-ai] operation failed", { kind });
    return { ok: false, reason: "PROVIDER_FAILED" };
  }
}
