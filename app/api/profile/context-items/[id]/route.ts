import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { deleteContextItem, updateContextItem } from "@/lib/profile/context-items-service";
import { scoreAfterSave } from "@/lib/profile/context-save";
import { updateContextItemSchema } from "@/lib/profile/schemas";
import { parseJsonBody } from "@/lib/profile/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;
  const body = await parseJsonBody(request, updateContextItemSchema);
  if (!body.ok) return body.response;

  try {
    const userId = check.session.user.id;
    const updated = await updateContextItem(userId, id, body.data);
    if (!updated) return notFoundResponse("Item");

    const result = await scoreAfterSave(userId, id);
    if (!result) return notFoundResponse("Item");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
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
    const deleted = await deleteContextItem(check.session.user.id, id);
    if (!deleted) return notFoundResponse("Item");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
