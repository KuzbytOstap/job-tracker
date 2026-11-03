import { NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { forbiddenResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { scorePendingContextItems } from "@/lib/profile/context-scoring-service";
import { CONTEXT_SCORE_BATCH_SIZE } from "@/lib/profile/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const result = await scorePendingContextItems(check.session.user.id, { limit: CONTEXT_SCORE_BATCH_SIZE });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
