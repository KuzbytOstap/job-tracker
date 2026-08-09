import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AiRequestStatus, AiRequestType } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/lib/admin/require-admin";
import { forbiddenResponse, serverErrorResponse, unauthorizedResponse, zodErrorResponse } from "@/lib/api-response";
import { listAiRequests } from "@/lib/admin/ai-requests";
import type { AdminAiRequestsListResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  status: z.enum(Object.values(AiRequestStatus) as [AiRequestStatus, ...AiRequestStatus[]]).optional(),
  type: z.enum(Object.values(AiRequestType) as [AiRequestType, ...AiRequestType[]]).optional(),
});

/**
 * Lists AI access/usage requests for the admin queue, optionally filtered
 * by status and/or type. Admin-only — see {@link requireAdmin}.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.status === "unauthenticated") return unauthorizedResponse();
  if (admin.status === "forbidden") return forbiddenResponse();

  const parsedQuery = listQuerySchema.safeParse({
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    type: request.nextUrl.searchParams.get("type") ?? undefined,
  });
  if (!parsedQuery.success) {
    return zodErrorResponse(parsedQuery.error);
  }

  try {
    const requests = await listAiRequests(parsedQuery.data);
    const body: AdminAiRequestsListResponse = { requests };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
