import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@/app/generated/prisma/client";
import {
  createApplicationSchema,
  listApplicationsQuerySchema,
} from "@/lib/validation";
import {
  buildApplicationsWhere,
  resolveTestTaskFlags,
  sortApplications,
  toApplicationDTO,
  toApplicationWithMeta,
} from "@/lib/applications";
import { jsonError, serverErrorResponse, zodErrorResponse } from "@/lib/api-response";
import type { ApplicationsListResponse } from "@/lib/api-types";

export async function GET(request: NextRequest) {
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

    const applications = await prisma.jobApplication.findMany({
      where: buildApplicationsWhere(q),
      include: { statusChanges: { orderBy: { changedAt: "desc" } } },
    });

    const now = new Date();
    const withMeta = applications.map((application) => toApplicationWithMeta(application, now));

    const filtered =
      status === "ALL"
        ? withMeta
        : withMeta.filter((application) => application.effectiveStatus === status);

    const sorted = sortApplications(filtered, sort);

    const body: ApplicationsListResponse = {
      applications: sorted.map(toApplicationDTO),
      total: sorted.length,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
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
    const { hasTestTask, testTaskDone } = resolveTestTaskFlags(parsed.data, {
      hasTestTask: false,
      testTaskDone: false,
    });

    const application = await prisma.jobApplication.create({
      data: {
        ...parsed.data,
        hasTestTask,
        testTaskDone,
        status: Status.APPLIED,
        lastActivityAt: now,
      },
      include: { statusChanges: { orderBy: { changedAt: "desc" } } },
    });

    return NextResponse.json(toApplicationDTO(toApplicationWithMeta(application, now)), {
      status: 201,
    });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
