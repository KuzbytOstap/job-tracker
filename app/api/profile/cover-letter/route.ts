import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { forbiddenResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { generateCoverLetter } from "@/lib/profile/cover-letter-service";
import { parseJsonBody } from "@/lib/profile/route-helpers";
import { generateCoverLetterSchema } from "@/lib/profile/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const body = await parseJsonBody(request, generateCoverLetterSchema);
  if (!body.ok) return body.response;

  try {
    const outcome = await generateCoverLetter(check.session.user.id, body.data);
    return NextResponse.json(outcome, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cover-letter] generation failed", { name: error instanceof Error ? error.name : "unknown" });
    return serverErrorResponse();
  }
}
