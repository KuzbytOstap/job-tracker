import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { forbiddenResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api-response";
import { getProfile, updateProfile } from "@/lib/profile/profile-service";
import { updateProfileSchema } from "@/lib/profile/schemas";
import { parseJsonBody } from "@/lib/profile/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const profile = await getProfile(check.session.user.id);
    return NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const body = await parseJsonBody(request, updateProfileSchema);
  if (!body.ok) return body.response;

  try {
    const profile = await updateProfile(check.session.user.id, body.data);
    return NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}
