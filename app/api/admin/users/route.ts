import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { forbiddenResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { listAdminUsers } from "@/lib/admin/users";
import type { AdminUsersListResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lists every user with role, AI access status, today's usage, effective
 * limits, and permanent overrides. Admin-only — see {@link requireAdmin}.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (admin.status === "unauthenticated") return unauthorizedResponse();
  if (admin.status === "forbidden") return forbiddenResponse();

  try {
    const users = await listAdminUsers();
    const body: AdminUsersListResponse = { users };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
