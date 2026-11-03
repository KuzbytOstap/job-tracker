import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { deleteExample, updateExample } from "@/lib/profile/examples-service";
import { updateExampleSchema } from "@/lib/profile/schemas";
import { parseJsonBody } from "@/lib/profile/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;
  const body = await parseJsonBody(request, updateExampleSchema);
  if (!body.ok) return body.response;

  try {
    const example = await updateExample(check.session.user.id, id, body.data);
    if (!example) return notFoundResponse("Example");
    return NextResponse.json(example, { headers: { "Cache-Control": "no-store" } });
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
    const deleted = await deleteExample(check.session.user.id, id);
    if (!deleted) return notFoundResponse("Example");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
