import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSession } from "@/lib/auth";
import { toApplicationDTO, toApplicationWithMeta } from "@/lib/applications";
import { generateVacancySpecificHrQuestions } from "@/lib/hr-questions-service";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Follow-up endpoint for the HR_CALL question flow. The status update itself
 * saves the core questions synchronously; this request runs the slower,
 * best-effort AI enhancement afterwards so the status response is never held
 * up by the OpenAI request. It's idempotent and always returns the current
 * full application DTO, so the client can merge whatever questions now exist.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;

  try {
    await generateVacancySpecificHrQuestions(id);

    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: { statusChanges: { orderBy: { changedAt: "desc" } } },
    });

    if (!application) {
      return notFoundResponse();
    }

    return NextResponse.json(toApplicationDTO(toApplicationWithMeta(application, new Date())));
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
