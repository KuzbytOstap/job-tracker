import type { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { jsonError, zodErrorResponse } from "@/lib/api-response";
import { ProfileInputError, type ProfileInputErrorCode } from "@/lib/profile/errors";
import { CV_MAX_BYTES } from "@/lib/profile/limits";

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseJsonBody<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
): Promise<ParsedBody<z.output<S>>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, "Invalid JSON body") };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, response: zodErrorResponse(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

const INPUT_ERRORS: Record<ProfileInputErrorCode, { status: number; message: string }> = {
  CV_NOT_PDF: { status: 415, message: "Only PDF files are accepted." },
  CV_TOO_LARGE: { status: 413, message: "The file is too large." },
  CV_LIMIT: { status: 409, message: "The CV limit is reached." },
  EXAMPLE_LIMIT: { status: 409, message: "The example limit is reached." },
};

export function profileInputErrorResponse(error: ProfileInputError): NextResponse {
  const { status, message } = INPUT_ERRORS[error.code];
  return jsonError(status, message, { code: error.code });
}

export type UploadedFile = { ok: true; form: FormData; file: File } | { ok: false; response: NextResponse };

export async function readUpload(request: NextRequest): Promise<UploadedFile> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, response: jsonError(400, "Expected multipart form data") };
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return { ok: false, response: jsonError(400, "A file is required") };
  }
  if (file.size > CV_MAX_BYTES) {
    return { ok: false, response: profileInputErrorResponse(new ProfileInputError("CV_TOO_LARGE")) };
  }
  return { ok: true, form, file };
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .split("")
    .filter((char) => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127)
    .join("")
    .trim()
    .slice(0, 200);
  return cleaned === "" ? "cv.pdf" : cleaned;
}

export function contentDispositionAttachment(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(fileName).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
