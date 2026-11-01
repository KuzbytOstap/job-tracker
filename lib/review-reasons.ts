import { Platform } from "@/app/generated/prisma/enums";

export const REVIEW_REASONS = [
  "salary",
  "platform",
  "company",
  "position",
  "details",
  "not_vacancy",
] as const;

export type ReviewReason = (typeof REVIEW_REASONS)[number];

export const REVIEW_REASON_LABELS: Record<ReviewReason, string> = {
  salary: "Salary isn't specified",
  platform: "Platform isn't recognized",
  company: "Company name looks unclear",
  position: "Position title looks unclear",
  details: "Details weren't filled in automatically",
  not_vacancy: "This may not be a single vacancy",
};

type ReviewSource = {
  reviewReasons?: string[];
  salaryExpectation: string | null;
  platform: Platform;
  customPlatformId?: string | null;
  customPlatform?: unknown;
};

function isReviewReason(value: string): value is ReviewReason {
  return (REVIEW_REASONS as readonly string[]).includes(value);
}

export function getVisibleReviewReasons(application: ReviewSource): ReviewReason[] {
  return (application.reviewReasons ?? []).filter(isReviewReason).filter((reason) => {
    if (reason === "salary") return !application.salaryExpectation?.trim();
    if (reason === "platform") {
      return (
        application.platform === Platform.OTHER &&
        !application.customPlatformId &&
        !application.customPlatform
      );
    }
    return true;
  });
}
