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
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/i18n/locales";
import { getUserLocale, setUserLocale } from "@/lib/user-settings";
import type { LocaleSettingsDTO } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ locale: z.enum(LOCALES).nullable() }).strict();

export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const locale = await getUserLocale(check.session.user.id);
    const body: LocaleSettingsDTO = { locale };
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
    const locale = await setUserLocale(check.session.user.id, parsed.data.locale);
    const body: LocaleSettingsDTO = { locale };
    const response = NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });

    if (locale) {
      response.cookies.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
        sameSite: "lax",
      });
    } else {
      response.cookies.delete(LOCALE_COOKIE);
    }

    return response;
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
