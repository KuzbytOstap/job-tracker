import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { importCvForUpload } from "@/lib/profile/cv-import-service";
import { getCvFile, replaceCvFile } from "@/lib/profile/cv-service";
import { ProfileInputError } from "@/lib/profile/errors";
import {
  contentDispositionAttachment,
  profileInputErrorResponse,
  readUpload,
  sanitizeFileName,
} from "@/lib/profile/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;

  try {
    const file = await getCvFile(check.session.user.id, id);
    if (!file) return notFoundResponse("CV");

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(file.bytes.byteLength),
        "Content-Disposition": contentDispositionAttachment(file.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(error);
    return serverErrorResponse();
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;
  const upload = await readUpload(request);
  if (!upload.ok) return upload.response;

  try {
    const userId = check.session.user.id;
    const bytes = new Uint8Array(await upload.file.arrayBuffer());
    const replaced = await replaceCvFile(userId, id, { fileName: sanitizeFileName(upload.file.name), bytes });
    if (!replaced) return notFoundResponse("CV");

    const result = await importCvForUpload(userId, id);
    if (!result) return notFoundResponse("CV");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProfileInputError) return profileInputErrorResponse(error);
    console.error(error);
    return serverErrorResponse();
  }
}
