import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  jsonError,
  serverErrorResponse,
  unauthorizedResponse,
  zodErrorResponse,
} from "@/lib/api-response";
import { AiAccessError, aiAccessErrorStatus } from "@/lib/ai/access-control";
import { AI_USAGE_REQUEST_TYPES, AiAccessRequestError, requestMoreAiUsage } from "@/lib/ai/access-requests";
import type { RequestMoreAiUsageResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestBodySchema = z.object({ type: z.enum(AI_USAGE_REQUEST_TYPES) }).strict();

/**
 * Creates a request-more-usage record for one exhausted quota
 * (VACANCY_LIMIT, HR_LIMIT, or TOKEN_LIMIT). Only an APPROVED user whose
 * corresponding quota is currently exhausted can succeed — see
 * {@link requestMoreAiUsage} for the eligibility checks. This never grants a
 * bonus; that's a separate, later admin decision.
 */
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

  const parsed = requestBodySchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const status = await requestMoreAiUsage(check.session.user.id, parsed.data.type);
    const body: RequestMoreAiUsageResponse = { status };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AiAccessError) {
      return jsonError(aiAccessErrorStatus(error.code), error.message, { code: error.code });
    }
    if (error instanceof AiAccessRequestError) {
      return jsonError(409, error.message, { code: error.code });
    }
    console.error(error);
    return serverErrorResponse();
  }
}
