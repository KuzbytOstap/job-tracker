import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { deleteCv, updateCvMeta } from "@/lib/profile/cv-service";
import { updateCvMetaSchema } from "@/lib/profile/schemas";
import { parseJsonBody } from "@/lib/profile/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;
  const body = await parseJsonBody(request, updateCvMetaSchema);
  if (!body.ok) return body.response;

  try {
    const cv = await updateCvMeta(check.session.user.id, id, body.data);
    if (!cv) return notFoundResponse("CV");
    return NextResponse.json(cv, { headers: { "Cache-Control": "no-store" } });
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
    const deleted = await deleteCv(check.session.user.id, id);
    if (!deleted) return notFoundResponse("CV");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
