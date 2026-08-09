import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { forbiddenResponse, jsonError, serverErrorResponse, unauthorizedResponse, zodErrorResponse } from "@/lib/api-response";
import { getAiGlobalLimits, updateAiGlobalLimits } from "@/lib/admin/settings";
import type { AiGlobalLimitsDTO } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsBodySchema = z
  .object({
    vacancyGenerationLimit: z.number().int().nonnegative().optional(),
    hrGenerationLimit: z.number().int().nonnegative().optional(),
    tokenLimit: z.number().int().nonnegative().optional(),
  })
  .strict();

function toDTO(limits: { vacancyGenerationLimit: number; hrGenerationLimit: number; tokenLimit: number; updatedAt: Date }): AiGlobalLimitsDTO {
  return {
    vacancyGenerationLimit: limits.vacancyGenerationLimit,
    hrGenerationLimit: limits.hrGenerationLimit,
    tokenLimit: limits.tokenLimit,
    updatedAt: limits.updatedAt.toISOString(),
  };
}

/**
 * Reads the `AiGlobalLimits` singleton (defaults 10/10/20000, safely
 * upserted into existence on first read). Admin-only — see
 * {@link requireAdmin}.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (admin.status === "unauthenticated") return unauthorizedResponse();
  if (admin.status === "forbidden") return forbiddenResponse();

  try {
    const limits = await getAiGlobalLimits();
    return NextResponse.json(toDTO(limits), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

/**
 * Updates only the provided global limit fields (non-negative integers);
 * anything omitted is left as-is, so the 10/10/20000 defaults survive until
 * an admin explicitly changes them. Admin-only — see {@link requireAdmin}.
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.status === "unauthenticated") return unauthorizedResponse();
  if (admin.status === "forbidden") return forbiddenResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = settingsBodySchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const limits = await updateAiGlobalLimits(parsed.data);
    return NextResponse.json(toDTO(limits), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
