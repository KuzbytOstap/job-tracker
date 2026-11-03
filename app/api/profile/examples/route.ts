import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { forbiddenResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { ProfileInputError } from "@/lib/profile/errors";
import { createExample, listExamples } from "@/lib/profile/examples-service";
import { createExampleSchema } from "@/lib/profile/schemas";
import { parseJsonBody, profileInputErrorResponse } from "@/lib/profile/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const examples = await listExamples(check.session.user.id);
    return NextResponse.json(examples, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const body = await parseJsonBody(request, createExampleSchema);
  if (!body.ok) return body.response;

  try {
    const example = await createExample(check.session.user.id, body.data);
    return NextResponse.json(example, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProfileInputError) return profileInputErrorResponse(error);
    console.error(error);
    return serverErrorResponse();
  }
}
