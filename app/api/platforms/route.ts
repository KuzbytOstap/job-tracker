import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  jsonError,
  serverErrorResponse,
  unauthorizedResponse,
  zodErrorResponse,
} from "@/lib/api-response";
import { platformNameSchema } from "@/lib/platforms";
import {
  PlatformServiceError,
  createCustomPlatform,
  listPlatformsForUser,
  platformServiceErrorStatus,
} from "@/lib/platforms-service";
import type { CreatePlatformResponse, PlatformsResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createPlatformBodySchema = z
  .object({ name: platformNameSchema, confirmNew: z.boolean().optional() })
  .strict();

export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const platforms = await listPlatformsForUser(check.session.user.id);
    const body: PlatformsResponse = { platforms };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = createPlatformBodySchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const result = await createCustomPlatform(
      check.session.user.id,
      parsed.data.name,
      parsed.data.confirmNew ?? false,
    );
    const body: CreatePlatformResponse = result;
    return NextResponse.json(body, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof PlatformServiceError) {
      return jsonError(platformServiceErrorStatus(error.code), error.message, {
        code: error.code,
        similar: error.similar,
      });
    }
    console.error(error);
    return serverErrorResponse();
  }
}
