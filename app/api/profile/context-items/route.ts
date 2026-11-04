import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { createContextItem, listContextItems } from "@/lib/profile/context-items-service";
import { scoreAfterSave } from "@/lib/profile/context-save";
import { createContextItemSchema } from "@/lib/profile/schemas";
import { parseJsonBody } from "@/lib/profile/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const items = await listContextItems(check.session.user.id);
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const body = await parseJsonBody(request, createContextItemSchema);
  if (!body.ok) return body.response;

  try {
    const userId = check.session.user.id;
    const created = await createContextItem(userId, body.data);
    const result = await scoreAfterSave(userId, created.id);
    if (!result) return notFoundResponse("Item");
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
