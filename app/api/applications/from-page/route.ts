import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSession } from "@/lib/auth";
import { Platform, Status } from "@/app/generated/prisma/enums";
import {
  forbiddenResponse,
  jsonError,
  serverErrorResponse,
  unauthorizedResponse,
  zodErrorResponse,
} from "@/lib/api-response";
import {
  APPLICATION_DETAIL_INCLUDE,
  toApplicationDTO,
  toApplicationWithMeta,
} from "@/lib/applications";
import {
  MIN_PAGE_TEXT_CHARS,
  buildPageText,
  cleanVacancyUrl,
  computeReviewReasons,
  fallbackCompany,
  fallbackPosition,
  isPrivatePageHost,
  normalizePageText,
  pageCaptureSchema,
  tryCleanVacancyUrl,
} from "@/lib/page-capture";
import { inferPlatformFromLink } from "@/lib/platform-inference";
import { findVisiblePlatformByName } from "@/lib/platforms-service";
import { runApplicationExtraction } from "@/lib/ai/run-application-extraction";
import { AiAccessError } from "@/lib/ai/access-control";
import { extractUrls } from "@/lib/url-extraction";
import { getAutoIgnoreAfterDays } from "@/lib/user-settings";
import type { ApplicationExtractionResult } from "@/lib/application-extraction";
import type { CapturePageResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUPLICATE_CANDIDATES_LIMIT = 20;

async function findDuplicateApplication(userId: string, cleanedUrl: string) {
  const url = new URL(cleanedUrl);

  const candidates = await prisma.jobApplication.findMany({
    where: { userId, link: { startsWith: `${url.origin}${url.pathname}` } },
    include: APPLICATION_DETAIL_INCLUDE,
    take: DUPLICATE_CANDIDATES_LIMIT,
  });

  return (
    candidates.find((candidate) => candidate.link && tryCleanVacancyUrl(candidate.link) === cleanedUrl) ?? null
  );
}

function describeFallbackReason(error: unknown): string {
  return error instanceof AiAccessError ? error.code : "extraction_failed";
}

export async function POST(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = pageCaptureSchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const capture = parsed.data;
  if (new URL(capture.url).host === request.nextUrl.host) {
    return jsonError(422, "This page is the tracker itself, not a job posting.", { code: "SELF_URL" });
  }
  if (isPrivatePageHost(capture.url)) {
    return jsonError(422, "This looks like a private page and can't be captured.", { code: "PRIVATE_PAGE" });
  }

  const userId = check.session.user.id;
  const cleanedUrl = cleanVacancyUrl(capture.url);

  try {
    const now = new Date();
    const autoIgnoreAfterDays = await getAutoIgnoreAfterDays(userId);

    const duplicate = await findDuplicateApplication(userId, cleanedUrl);
    if (duplicate) {
      const body: CapturePageResponse = {
        status: "duplicate",
        application: toApplicationDTO(toApplicationWithMeta(duplicate, now, autoIgnoreAfterDays)),
      };
      return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
    }

    let extraction: ApplicationExtractionResult | null = null;
    let fallbackReason: string | null = null;

    if (normalizePageText(capture.pageText).length < MIN_PAGE_TEXT_CHARS) {
      fallbackReason = "page_text_too_short";
    } else {
      try {
        extraction = await runApplicationExtraction(userId, {
          jobPostingText: buildPageText(capture, cleanedUrl, { includeStructuredData: true }),
        });
      } catch (error) {
        fallbackReason = describeFallbackReason(error);
        if (!(error instanceof AiAccessError)) {
          console.error("[from-page] extraction failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    }

    const notJobPosting = extraction?.isJobPosting === false;
    if (notJobPosting && !capture.confirmNotVacancy) {
      const body: CapturePageResponse = { status: "needs_confirmation", reason: "not_vacancy" };
      return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
    }

    let platform: Platform = inferPlatformFromLink(cleanedUrl) ?? extraction?.platform ?? Platform.OTHER;
    let customPlatformId: string | null = null;
    let suggestedPlatformName: string | null = null;

    if (platform === Platform.OTHER && extraction?.suggestedPlatformName) {
      const known = await findVisiblePlatformByName(userId, extraction.suggestedPlatformName);
      if (known) {
        platform = known.platform;
        customPlatformId = known.customPlatformId;
      } else {
        suggestedPlatformName = extraction.suggestedPlatformName;
      }
    }

    const company = extraction?.company ?? fallbackCompany(capture, cleanedUrl);
    const position = extraction?.position ?? fallbackPosition(capture);
    const salaryExpectation = extraction?.salaryExpectation ?? null;
    const jobPostingText = buildPageText(capture, cleanedUrl, { includeStructuredData: false });

    const application = await prisma.jobApplication.create({
      data: {
        company,
        position,
        platform,
        customPlatformId,
        suggestedPlatformName,
        reviewReasons: computeReviewReasons({
          aiUsed: extraction !== null,
          hasCompany: Boolean(extraction?.company),
          hasPosition: Boolean(extraction?.position),
          hasSalary: salaryExpectation !== null,
          platform,
          hasCustomPlatform: customPlatformId !== null,
          notJobPosting,
        }),
        link: cleanedUrl,
        salaryExpectation,
        notes: extraction?.notes ?? null,
        jobPostingText,
        sourceUrls: extractUrls(normalizePageText(capture.pageText)),
        status: Status.APPLIED,
        lastActivityAt: now,
        userId,
      },
      include: APPLICATION_DETAIL_INCLUDE,
    });

    const body: CapturePageResponse = {
      status: "created",
      application: toApplicationDTO(toApplicationWithMeta(application, now, autoIgnoreAfterDays)),
      extraction: extraction ? "ai" : "fallback",
      fallbackReason,
    };
    return NextResponse.json(body, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
