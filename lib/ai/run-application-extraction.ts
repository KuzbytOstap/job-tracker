import { AiFeature } from "@/app/generated/prisma/client";
import {
  applicationExtractionResultSchema,
  type ApplicationExtractionInput,
  type ApplicationExtractionResult,
} from "@/lib/application-extraction";
import {
  ApplicationExtractionProviderError,
} from "@/lib/ai/application-extraction-provider";
import { getApplicationExtractionProvider } from "@/lib/ai/get-application-extraction-provider";
import { requireAiAccessApproved, runGatedAiCall } from "@/lib/ai/access-control";

export async function runApplicationExtraction(
  userId: string,
  input: ApplicationExtractionInput,
): Promise<ApplicationExtractionResult> {
  const provider = getApplicationExtractionProvider();

  let rawResult;
  if (provider.name === "mock") {
    await requireAiAccessApproved(userId);
    rawResult = await provider.extractApplication(input);
  } else {
    rawResult = await runGatedAiCall({
      userId,
      feature: AiFeature.VACANCY_GENERATION,
      maxOutputTokens: provider.maxOutputTokens,
      countInputTokens: () => provider.countInputTokens(input),
      call: (reportUsage) => provider.extractApplication(input, { onUsage: reportUsage }),
    });
  }

  const parsed = applicationExtractionResultSchema.safeParse(rawResult);
  if (!parsed.success) {
    throw new ApplicationExtractionProviderError("Couldn't extract application details.");
  }

  return parsed.data;
}
