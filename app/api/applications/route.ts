import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@/app/generated/prisma/client";
import { checkSession } from "@/lib/auth";
import {
  createApplicationSchema,
  listApplicationsQuerySchema,
} from "@/lib/validation";
import {
  APPLICATION_DETAIL_INCLUDE,
  APPLICATION_LIST_ITEM_SELECT,
  buildApplicationsWhere,
  resolveTestTaskFlags,
  sortApplications,
  toApplicationDTO,
  toApplicationListItemDTO,
  toApplicationListItemWithMeta,
  toApplicationWithMeta,
} from "@/lib/applications";
import {
  forbiddenResponse,
  jsonError,
  serverErrorResponse,
  unauthorizedResponse,
  zodErrorResponse,
} from "@/lib/api-response";
import type { ApplicationsListResponse } from "@/lib/api-types";
import { extractUrls } from "@/lib/url-extraction";
import { getAutoIgnoreAfterDays } from "@/lib/user-settings";
import { resolveApplicationPlatform } from "@/lib/platforms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const parsedQuery = listApplicationsQuerySchema.safeParse({
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    sort: request.nextUrl.searchParams.get("sort") ?? undefined,
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });

  if (!parsedQuery.success) {
    return zodErrorResponse(parsedQuery.error);
  }

  try {
    const { status, sort, q } = parsedQuery.data;

    const [rows, autoIgnoreAfterDays] = await Promise.all([
      prisma.jobApplication.findMany({
        where: buildApplicationsWhere(q, check.session.user.id),
        select: APPLICATION_LIST_ITEM_SELECT,
      }),
      getAutoIgnoreAfterDays(check.session.user.id),
    ]);

    const now = new Date();
    const withMeta = rows.map((row) => toApplicationListItemWithMeta(row, now, autoIgnoreAfterDays));

    const filtered =
      status === "ALL"
        ? withMeta
        : withMeta.filter((application) => application.effectiveStatus === status);

    const sorted = sortApplications(filtered, sort);

    const body: ApplicationsListResponse = {
      applications: sorted.map(toApplicationListItemDTO),
      total: sorted.length,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
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

  const parsed = createApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const now = new Date();
    const platformWrite = await resolveApplicationPlatform(check.session.user.id, parsed.data);
    if (!platformWrite.ok) {
      return jsonError(400, "Unknown platform");
    }

    const { hasTestTask, testTaskDone } = resolveTestTaskFlags(parsed.data, {
      hasTestTask: false,
      testTaskDone: false,
    });

    const application = await prisma.jobApplication.create({
      data: {
        ...parsed.data,
        ...platformWrite.data,
        hasTestTask,
        testTaskDone,
        status: Status.APPLIED,
        lastActivityAt: now,
        sourceUrls: extractUrls(parsed.data.jobPostingText),
        userId: check.session.user.id,
      },
      include: APPLICATION_DETAIL_INCLUDE,
    });

    const autoIgnoreAfterDays = await getAutoIgnoreAfterDays(check.session.user.id);

    return NextResponse.json(
      toApplicationDTO(toApplicationWithMeta(application, now, autoIgnoreAfterDays)),
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
