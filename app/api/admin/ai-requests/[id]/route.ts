import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { forbiddenResponse, jsonError, serverErrorResponse, unauthorizedResponse, zodErrorResponse } from "@/lib/api-response";
import { AdminAiRequestError, adminAiRequestErrorStatus, decideAiRequest } from "@/lib/admin/ai-requests";
import type { AdminAiRequestDTO } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const decisionBodySchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    decisionNote: z.string().trim().max(2000).optional(),
    grantedAmount: z.number().int().positive().optional(),
  })
  .strict();

/**
 * Approves or rejects one pending AI request (AI_ACCESS or a usage-limit
 * request). Admin-only — see {@link requireAdmin}. `grantedAmount` is
 * required to approve a usage-limit request and ignored otherwise; all the
 * eligibility rules (PENDING only, current-quota-day only for usage
 * requests, no double-grant) live in {@link decideAiRequest}.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (admin.status === "unauthenticated") return unauthorizedResponse();
  if (admin.status === "forbidden") return forbiddenResponse();

  const { id } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = decisionBodySchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const result = await decideAiRequest({
      requestId: id,
      adminUserId: admin.userId,
      decision: parsed.data.decision,
      decisionNote: parsed.data.decisionNote ?? null,
      grantedAmount: parsed.data.grantedAmount ?? null,
    });
    const body: AdminAiRequestDTO = result;
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminAiRequestError) {
      return jsonError(adminAiRequestErrorStatus(error.code), error.message, { code: error.code });
    }
    console.error(error);
    return serverErrorResponse();
  }
}
