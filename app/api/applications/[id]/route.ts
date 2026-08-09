import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@/app/generated/prisma/client";
import { checkSession } from "@/lib/auth";
import { updateApplicationSchema } from "@/lib/validation";
import { resolveTestTaskFlags, toApplicationDTO, toApplicationWithMeta } from "@/lib/applications";
import { ensureCoreHrQuestionsForTransition } from "@/lib/hr-questions-service";
import { extractUrls } from "@/lib/url-extraction";
import {
  conflictResponse,
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
  const userId = check.session.user.id;

  try {
    const application = await prisma.jobApplication.findFirst({
      where: { id, userId },
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
  const userId = check.session.user.id;

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

  const now = new Date();
  const { status, expectedUpdatedAt, ...rest } = parsed.data;

  try {
    // Everything that reads the current row and derives the status change is
    // done inside one interactive transaction. When the client sends an
    // optimistic-concurrency token (expectedUpdatedAt), the write is guarded on
    // that exact updatedAt so two concurrent PATCHes can't silently overwrite
    // each other or produce a StatusChange from a stale fromStatus.
    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.jobApplication.findFirst({ where: { id, userId } });
      if (!existing) {
        return { kind: "not_found" as const };
      }

      if (expectedUpdatedAt && existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        return { kind: "conflict" as const };
      }

      const { hasTestTask, testTaskDone } = resolveTestTaskFlags(parsed.data, existing);
      const statusChanged = status !== undefined && status !== existing.status;

      const updateResult = await tx.jobApplication.updateMany({
        where: {
          id,
          userId,
          ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
        },
        data: {
          ...rest,
          hasTestTask,
          testTaskDone,
          ...(status !== undefined ? { status } : {}),
          ...(rest.jobPostingText !== undefined
            ? { sourceUrls: extractUrls(rest.jobPostingText) }
            : {}),
          lastActivityAt: now,
        },
      });

      // The row moved between our read and our guarded write: lost the race.
      if (updateResult.count === 0) {
        return { kind: "conflict" as const };
      }

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

      const application = await tx.jobApplication.findFirstOrThrow({
        where: { id, userId },
        include: { statusChanges: { orderBy: { changedAt: "desc" } } },
      });

      return {
        kind: "ok" as const,
        application,
        previousStatus: existing.status,
        statusChanged,
        existingHrInterviewQuestions: existing.hrInterviewQuestions,
      };
    });

    if (outcome.kind === "not_found") {
      return notFoundResponse();
    }
    if (outcome.kind === "conflict") {
      return conflictResponse();
    }

    let finalApplication = outcome.application;

    // Persist the deterministic core HR questions immediately (fast, no AI) so
    // the status change and its base questions are saved reliably. The slower
    // vacancy-specific enhancement is triggered separately by the client via
    // POST /api/applications/[id]/hr-questions, so this response is never
    // delayed by the AI request.
    if (outcome.statusChanged && status === Status.HR_CALL) {
      const coreResult = await ensureCoreHrQuestionsForTransition({
        applicationId: id,
        userId,
        previousStatus: outcome.previousStatus,
        newStatus: status,
        existingHrInterviewQuestions: outcome.existingHrInterviewQuestions,
      });

      if (coreResult) {
        finalApplication = {
          ...outcome.application,
          hrInterviewQuestions: coreResult.hrInterviewQuestions,
          hrQuestionsGeneratedAt: coreResult.hrQuestionsGeneratedAt,
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
  const userId = check.session.user.id;

  try {
    const { count } = await prisma.jobApplication.deleteMany({ where: { id, userId } });

    if (count === 0) {
      return notFoundResponse();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
