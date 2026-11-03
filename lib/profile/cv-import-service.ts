import type { CvIdentitySuggestionsDTO } from "@/lib/api-types";
import { getCvFile, setCvText } from "@/lib/profile/cv-service";
import { runProfileOperation, type ProfileAiSkipReason } from "@/lib/profile/run-profile-ai";

export type CvImportResult =
  | { status: "extracted"; identity: CvIdentitySuggestionsDTO }
  | { status: "skipped"; reason: ProfileAiSkipReason };

function emptyToNull(value: string | null): string | null {
  return value === null || value.trim() === "" ? null : value;
}

export async function importCvText(userId: string, cvId: string): Promise<CvImportResult> {
  const file = await getCvFile(userId, cvId);
  if (!file) {
    return { status: "skipped", reason: "CV_NOT_FOUND" };
  }

  const outcome = await runProfileOperation({
    userId,
    select: (provider) => provider.extractCv,
    input: { fileName: file.fileName, pdfBase64: file.bytes.toString("base64") },
  });
  if (!outcome.ok) {
    return { status: "skipped", reason: outcome.reason };
  }

  const saved = await setCvText(userId, cvId, outcome.result.text);
  if (!saved) {
    return { status: "skipped", reason: "CV_NOT_FOUND" };
  }

  const { identity } = outcome.result;
  return {
    status: "extracted",
    identity: {
      firstName: emptyToNull(identity.firstName),
      lastName: emptyToNull(identity.lastName),
      email: emptyToNull(identity.email),
      phone: emptyToNull(identity.phone),
      city: emptyToNull(identity.city),
    },
  };
}
