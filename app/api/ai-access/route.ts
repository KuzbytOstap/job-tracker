import { NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { forbiddenResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { getAiAccessStatus } from "@/lib/ai/access-requests";
import type { AiAccessStatusResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const status = await getAiAccessStatus(check.session.user.id);
    const body: AiAccessStatusResponse = { status };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
