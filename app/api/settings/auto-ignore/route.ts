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
import { AUTO_IGNORE_MAX_DAYS, AUTO_IGNORE_MIN_DAYS } from "@/lib/status";
import { getAutoIgnoreAfterDays, setAutoIgnoreAfterDays } from "@/lib/user-settings";
import type { AutoIgnoreSettingsDTO } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    autoIgnoreAfterDays: z
      .number()
      .int()
      .min(AUTO_IGNORE_MIN_DAYS)
      .max(AUTO_IGNORE_MAX_DAYS)
      .nullable(),
  })
  .strict();

export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const autoIgnoreAfterDays = await getAutoIgnoreAfterDays(check.session.user.id);
    const body: AutoIgnoreSettingsDTO = { autoIgnoreAfterDays };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const autoIgnoreAfterDays = await setAutoIgnoreAfterDays(
      check.session.user.id,
      parsed.data.autoIgnoreAfterDays,
    );
    const body: AutoIgnoreSettingsDTO = { autoIgnoreAfterDays };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
