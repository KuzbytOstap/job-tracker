import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { forbiddenResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { listPlatformProposals } from "@/lib/platforms-service";
import type { AdminPlatformProposalsResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.status === "unauthenticated") return unauthorizedResponse();
  if (admin.status === "forbidden") return forbiddenResponse();

  try {
    const proposals = await listPlatformProposals();
    const body: AdminPlatformProposalsResponse = { proposals };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
