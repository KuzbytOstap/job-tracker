import { NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { forbiddenResponse, jsonError, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { AiAccessError, aiAccessErrorStatus, getAiUsageStatus } from "@/lib/ai/access-control";
import { getPendingUsageRequestTypes } from "@/lib/ai/access-requests";
import type { AiUsageStatusResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports the current user's UTC-day AI usage against their effective
 * limits (global defaults, permanent overrides, today's bonuses) for all
 * three quotas, plus whether a request-more-usage submission is already
 * pending for each. Delegates access gating to `getAiUsageStatus`
 * (`requireAiAccessApproved`), so a non-approved caller gets the same
 * structured `AI_ACCESS_REQUIRED`/`AI_SUSPENDED` response real AI calls do.
 */
export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const userId = check.session.user.id;
    const usage = await getAiUsageStatus(userId);
    const pendingTypes = await getPendingUsageRequestTypes(userId);

    const body: AiUsageStatusResponse = {
      resetAt: usage.resetAt,
      vacancy: { ...usage.vacancy, pendingRequest: pendingTypes.includes("VACANCY_LIMIT") },
      hr: { ...usage.hr, pendingRequest: pendingTypes.includes("HR_LIMIT") },
      tokens: { ...usage.tokens, pendingRequest: pendingTypes.includes("TOKEN_LIMIT") },
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AiAccessError) {
      return jsonError(aiAccessErrorStatus(error.code), error.message, { code: error.code });
    }
    console.error(error);
    return serverErrorResponse();
  }
}
