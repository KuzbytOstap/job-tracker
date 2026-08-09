import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { forbiddenResponse, jsonError, serverErrorResponse, unauthorizedResponse, zodErrorResponse } from "@/lib/api-response";
import { AdminUserError, adminUserErrorStatus, setAiUserLimitOverrides } from "@/lib/admin/users";
import type { AdminUserOverrides } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const nonNegativeIntOrNull = z.union([z.number().int().nonnegative(), z.null()]).optional();

const limitsBodySchema = z
  .object({
    vacancyGenerationLimit: nonNegativeIntOrNull,
    hrGenerationLimit: nonNegativeIntOrNull,
    tokenLimit: nonNegativeIntOrNull,
  })
  .strict();

/**
 * Sets or removes a user's permanent per-feature limit overrides. A field
 * set to a non-negative integer pins that limit; set to `null`, it removes
 * the override (falls back to the global default); omitted, it is left
 * unchanged. Admin-only — see {@link requireAdmin}.
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

  const parsed = limitsBodySchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const overrides = await setAiUserLimitOverrides(id, parsed.data);
    const body: AdminUserOverrides = overrides;
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminUserError) {
      return jsonError(adminUserErrorStatus(error.code), error.message, { code: error.code });
    }
    console.error(error);
    return serverErrorResponse();
  }
}
