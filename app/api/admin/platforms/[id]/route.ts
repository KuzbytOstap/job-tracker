import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  forbiddenResponse,
  jsonError,
  serverErrorResponse,
  unauthorizedResponse,
  zodErrorResponse,
} from "@/lib/api-response";
import {
  PlatformServiceError,
  decidePlatformProposal,
  platformServiceErrorStatus,
} from "@/lib/platforms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const decisionBodySchema = z
  .object({ decision: z.enum(["APPROVED", "REJECTED"]) })
  .strict();

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
    await decidePlatformProposal({
      proposalId: id,
      adminUserId: admin.userId,
      decision: parsed.data.decision,
    });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlatformServiceError) {
      return jsonError(platformServiceErrorStatus(error.code), error.message, { code: error.code });
    }
    console.error(error);
    return serverErrorResponse();
  }
}
