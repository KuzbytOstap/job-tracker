import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { forbiddenResponse, jsonError, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { AdminUserError, adminUserErrorStatus, suspendAiAccess } from "@/lib/admin/users";
import type { AiAccessStatusResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Suspends an APPROVED user's AI access. Admin-only — see
 * {@link requireAdmin}. Only succeeds from APPROVED; see
 * {@link suspendAiAccess} for the guarded transition.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (admin.status === "unauthenticated") return unauthorizedResponse();
  if (admin.status === "forbidden") return forbiddenResponse();

  const { id } = await params;

  try {
    const status = await suspendAiAccess(id);
    const body: AiAccessStatusResponse = { status };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminUserError) {
      return jsonError(adminUserErrorStatus(error.code), error.message, { code: error.code });
    }
    console.error(error);
    return serverErrorResponse();
  }
}
