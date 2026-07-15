import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@/app/generated/prisma/client";
import { STATUS_VALUES } from "@/lib/validation";
import {
  effectiveStatus,
  INTERVIEW_OR_FURTHER_STATUSES,
  REPLIED_OR_FURTHER_STATUSES,
} from "@/lib/status";
import { serverErrorResponse } from "@/lib/api-response";
import { buildFunnelStage } from "@/lib/stats";
import type { StatsResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const applications = await prisma.jobApplication.findMany({
      select: {
        status: true,
        lastActivityAt: true,
        statusChanges: { select: { toStatus: true } },
      },
    });

    const now = new Date();
    const total = applications.length;

    const counts = STATUS_VALUES.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<Status, number>);

    let repliedOrFurther = 0;
    let interviewsOrFurther = 0;
    let offers = 0;

    for (const application of applications) {
      const computedStatus = effectiveStatus(application, now);
      counts[computedStatus] += 1;

      const reachedStatuses = new Set(application.statusChanges.map((change) => change.toStatus));
      reachedStatuses.add(application.status);

      if ([...reachedStatuses].some((status) => REPLIED_OR_FURTHER_STATUSES.has(status))) {
        repliedOrFurther += 1;
      }
      if ([...reachedStatuses].some((status) => INTERVIEW_OR_FURTHER_STATUSES.has(status))) {
        interviewsOrFurther += 1;
      }
      if (reachedStatuses.has(Status.OFFER)) {
        offers += 1;
      }
    }

    const body: StatsResponse = {
      total,
      counts,
      waitingForReply: counts[Status.APPLIED],
      repliedOrFurther,
      interviewsOrFurther,
      offers,
      funnel: {
        applied: buildFunnelStage(total, total),
        replied: buildFunnelStage(repliedOrFurther, total),
        interviews: buildFunnelStage(interviewsOrFurther, total),
        offers: buildFunnelStage(offers, total),
      },
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
