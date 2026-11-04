import { AiFeature, type Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  APPLICATION_DETAIL_INCLUDE,
  toApplicationDTO,
  toApplicationWithMeta,
} from "@/lib/applications";
import type { FitAnalysisDTO, FitAnalysisOutcomeDTO } from "@/lib/api-types";
import { countFitMismatches, normalizeFitResult } from "@/lib/fit-analysis";
import { listContextItems } from "@/lib/profile/context-items-service";
import { resolveCvText } from "@/lib/profile/cv-service";
import { getProfile } from "@/lib/profile/profile-service";
import { runProfileOperation } from "@/lib/profile/run-profile-ai";
import { getAutoIgnoreAfterDays, getUserLocale } from "@/lib/user-settings";

const STORE_ATTEMPTS = 3;

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("Application not found");
    this.name = "ApplicationNotFoundError";
  }
}

export class FitAnalysisStoreConflictError extends Error {
  constructor() {
    super("Application kept changing while the fit analysis was stored");
    this.name = "FitAnalysisStoreConflictError";
  }
}

async function storeFitAnalysis(
  userId: string,
  applicationId: string,
  analysis: FitAnalysisDTO,
  analyzedAt: Date,
): Promise<void> {
  for (let attempt = 0; attempt < STORE_ATTEMPTS; attempt += 1) {
    const current = await prisma.jobApplication.findFirst({
      where: { id: applicationId, userId },
      select: { updatedAt: true, lastActivityAt: true },
    });
    if (!current) {
      throw new ApplicationNotFoundError();
    }

    const stored = await prisma.jobApplication.updateMany({
      where: { id: applicationId, userId, updatedAt: current.updatedAt },
      data: {
        fitAnalysis: analysis as unknown as Prisma.InputJsonValue,
        fitAnalyzedAt: analyzedAt,
        fitMismatchCount: countFitMismatches(analysis.items),
        updatedAt: current.updatedAt,
        lastActivityAt: current.lastActivityAt,
      },
    });
    if (stored.count > 0) return;
  }

  throw new FitAnalysisStoreConflictError();
}

export async function analyzeApplicationFit(userId: string, applicationId: string): Promise<FitAnalysisOutcomeDTO> {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, userId },
    select: { company: true, position: true, jobPostingText: true },
  });
  if (!application) {
    throw new ApplicationNotFoundError();
  }

  const vacancyText = application.jobPostingText?.trim();
  if (!vacancyText) {
    return { status: "skipped", reason: "NO_VACANCY_TEXT" };
  }

  const cv = await resolveCvText(userId);
  if (cv.status === "missing") {
    return { status: "skipped", reason: cv.reason };
  }

  const [profile, contextItems, locale] = await Promise.all([
    getProfile(userId),
    listContextItems(userId),
    getUserLocale(userId),
  ]);

  const outcome = await runProfileOperation({
    userId,
    feature: AiFeature.FIT_ANALYSIS,
    select: (provider) => provider.analyzeFit,
    input: {
      vacancyText,
      cvText: cv.text,
      contextItems: contextItems.map((item) => item.text),
      searchPreferences: {
        salaryAmount: profile.salary.amount,
        salaryCurrency: profile.salary.currency,
        salaryPeriod: profile.salary.period,
        employmentTypes: profile.employmentTypes,
        workFormats: profile.workFormats,
      },
      company: application.company,
      position: application.position,
      reasonLanguage: locale,
    },
  });

  if (!outcome.ok) {
    return { status: "skipped", reason: outcome.reason };
  }

  const analyzedAt = new Date();
  const analysis = normalizeFitResult(outcome.result, analyzedAt);
  if (!analysis) {
    return { status: "skipped", reason: "PROVIDER_FAILED" };
  }

  await storeFitAnalysis(userId, applicationId, analysis, analyzedAt);

  const [stored, autoIgnoreAfterDays] = await Promise.all([
    prisma.jobApplication.findFirst({
      where: { id: applicationId, userId },
      include: APPLICATION_DETAIL_INCLUDE,
    }),
    getAutoIgnoreAfterDays(userId),
  ]);
  if (!stored) {
    throw new ApplicationNotFoundError();
  }

  return {
    status: "ok",
    application: toApplicationDTO(toApplicationWithMeta(stored, new Date(), autoIgnoreAfterDays)),
  };
}
