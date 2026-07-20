import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@/app/generated/prisma/client";
import { checkSession } from "@/lib/auth";
import { updateApplicationSchema } from "@/lib/validation";
import { resolveTestTaskFlags, toApplicationDTO, toApplicationWithMeta } from "@/lib/applications";
import { maybeGenerateHrQuestionsOnTransition } from "@/lib/hr-questions-service";
import {
  forbiddenResponse,
  jsonError,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
  zodErrorResponse,
} from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;

  try {
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

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = updateApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const existing = await prisma.jobApplication.findUnique({ where: { id } });
    if (!existing) {
      return notFoundResponse();
    }

    const now = new Date();
    const { status, ...rest } = parsed.data;
    const { hasTestTask, testTaskDone } = resolveTestTaskFlags(parsed.data, existing);
    const statusChanged = status !== undefined && status !== existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.jobApplication.update({
        where: { id },
        data: {
          ...rest,
          hasTestTask,
          testTaskDone,
          ...(status !== undefined ? { status } : {}),
          lastActivityAt: now,
        },
      });

      if (statusChanged) {
        await tx.statusChange.create({
          data: {
            applicationId: id,
            fromStatus: existing.status,
            toStatus: status!,
            changedAt: now,
          },
        });
      }

      return tx.jobApplication.findUniqueOrThrow({
        where: { id },
        include: { statusChanges: { orderBy: { changedAt: "desc" } } },
      });
    });

    let finalApplication = updated;

    if (statusChanged && status === Status.HR_CALL) {
      const hrResult = await maybeGenerateHrQuestionsOnTransition({
        applicationId: id,
        previousStatus: existing.status,
        newStatus: status!,
        existingHrInterviewQuestions: existing.hrInterviewQuestions,
        context: {
          company: updated.company,
          position: updated.position,
          platform: updated.platform,
          salaryExpectation: updated.salaryExpectation,
          notes: updated.notes,
          jobPostingText: updated.jobPostingText,
          coverLetterText: updated.coverLetterText,
        },
      });

      if (hrResult) {
        finalApplication = {
          ...updated,
          hrInterviewQuestions: hrResult.hrInterviewQuestions,
          hrQuestionsGeneratedAt: hrResult.hrQuestionsGeneratedAt,
        };
      }
    }

    return NextResponse.json(toApplicationDTO(toApplicationWithMeta(finalApplication, now)));
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;

  try {
    const existing = await prisma.jobApplication.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return notFoundResponse();
    }

    await prisma.jobApplication.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
