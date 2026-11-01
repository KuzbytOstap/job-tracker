import { z } from "zod";
import { Platform } from "@/app/generated/prisma/enums";

export const MIN_PAGE_TEXT_CHARS = 300;
export const FALLBACK_POSITION = "Untitled position";

const PAGE_TEXT_MAX_CHARS = 30_000;
const STORED_TEXT_MAX_CHARS = 50_000;
const STRUCTURED_DATA_MAX_CHARS = 5_000;
const FALLBACK_POSITION_MAX_CHARS = 200;

const TRACKING_PARAMS = new Set([
  "source",
  "src",
  "ref",
  "referrer",
  "refid",
  "trackingid",
  "trk",
  "lipi",
  "fbclid",
  "gclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "gh_src",
  "lever-source",
]);

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const pageCaptureSchema = z
  .object({
    url: z
      .string()
      .trim()
      .max(2048)
      .refine(isHttpUrl, { message: "url must be a valid http or https URL" }),
    title: z.string().trim().max(500).optional(),
    siteName: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    pageText: z.string().max(300_000),
    jsonLd: z.array(z.string().max(100_000)).max(5).optional(),
    confirmNotVacancy: z.boolean().optional(),
  })
  .strict();

export type PageCaptureInput = z.infer<typeof pageCaptureSchema>;

export function cleanVacancyUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";

  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith("utm_") || TRACKING_PARAMS.has(lower)) {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}

export function tryCleanVacancyUrl(rawUrl: string): string | null {
  try {
    return cleanVacancyUrl(rawUrl);
  } catch {
    return null;
  }
}

export function normalizePageText(pageText: string): string {
  return pageText
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildPageText(
  capture: PageCaptureInput,
  cleanedUrl: string,
  options: { includeStructuredData: boolean },
): string {
  const header = [
    capture.title ? `Page title: ${capture.title}` : null,
    capture.siteName ? `Site name: ${capture.siteName}` : null,
    `Page URL: ${cleanedUrl}`,
    capture.description ? `Meta description: ${capture.description}` : null,
    ...(options.includeStructuredData
      ? (capture.jsonLd ?? []).map(
          (json) => `Structured data: ${json.slice(0, STRUCTURED_DATA_MAX_CHARS)}`,
        )
      : []),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const body = normalizePageText(capture.pageText).slice(0, PAGE_TEXT_MAX_CHARS);

  return `${header}\n\n${body}`.slice(0, STORED_TEXT_MAX_CHARS);
}

export function fallbackCompany(capture: PageCaptureInput, cleanedUrl: string): string {
  if (capture.siteName) return capture.siteName;
  return new URL(cleanedUrl).hostname.replace(/^www\./, "");
}

export function fallbackPosition(capture: PageCaptureInput): string {
  const title = capture.title?.trim();
  return title ? title.slice(0, FALLBACK_POSITION_MAX_CHARS) : FALLBACK_POSITION;
}

export type ReviewReason = "salary" | "platform" | "company" | "position" | "details" | "not_vacancy";

export function computeReviewReasons(input: {
  aiUsed: boolean;
  hasCompany: boolean;
  hasPosition: boolean;
  hasSalary: boolean;
  platform: Platform;
  hasCustomPlatform: boolean;
  notJobPosting: boolean;
}): ReviewReason[] {
  const reasons: ReviewReason[] = [];

  if (input.notJobPosting) reasons.push("not_vacancy");
  if (!input.aiUsed) reasons.push("details");
  if (!input.hasCompany) reasons.push("company");
  if (!input.hasPosition) reasons.push("position");
  if (!input.hasSalary) reasons.push("salary");
  if (input.platform === Platform.OTHER && !input.hasCustomPlatform) reasons.push("platform");

  return reasons;
}
