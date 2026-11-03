import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
  zodErrorResponse,
} from "@/lib/api-response";
import { importCvForUpload } from "@/lib/profile/cv-import-service";
import { createCv, listCvs } from "@/lib/profile/cv-service";
import { ProfileInputError } from "@/lib/profile/errors";
import { createCvMetaSchema } from "@/lib/profile/schemas";
import { profileInputErrorResponse, readUpload, sanitizeFileName } from "@/lib/profile/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  try {
    const cvs = await listCvs(check.session.user.id);
    return NextResponse.json(cvs, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const upload = await readUpload(request);
  if (!upload.ok) return upload.response;

  const meta = createCvMetaSchema.safeParse({
    label: upload.form.get("label"),
    language: upload.form.get("language"),
  });
  if (!meta.success) return zodErrorResponse(meta.error);

  try {
    const userId = check.session.user.id;
    const bytes = new Uint8Array(await upload.file.arrayBuffer());
    const cv = await createCv(userId, {
      label: meta.data.label,
      language: meta.data.language ?? null,
      fileName: sanitizeFileName(upload.file.name),
      bytes,
    });

    const result = await importCvForUpload(userId, cv.id);
    if (!result) return notFoundResponse("CV");
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProfileInputError) return profileInputErrorResponse(error);
    console.error(error);
    return serverErrorResponse();
  }
}
