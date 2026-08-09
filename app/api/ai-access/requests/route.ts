import { NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { forbiddenResponse, jsonError, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { AiAccessRequestError, aiAccessRequestErrorStatus, requestAiAccess } from "@/lib/ai/access-requests";
import type { AiAccessStatusResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates an AI_ACCESS request for the current user, moving them from
 * NOT_REQUESTED to PENDING. Only eligible (NOT_REQUESTED) users can call
 * this — anyone already PENDING, APPROVED, REJECTED, or SUSPENDED is
 * rejected with 409, so this can never be used to re-request or bypass a
 * decision. See {@link requestAiAccess} for the atomic transition.
 */
export async function POST() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const status = await requestAiAccess(check.session.user.id);
    const body: AiAccessStatusResponse = { status };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AiAccessRequestError) {
      return jsonError(aiAccessRequestErrorStatus(error.code), error.message, { code: error.code });
    }
    console.error(error);
    return serverErrorResponse();
  }
}
