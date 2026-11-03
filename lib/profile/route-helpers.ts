import type { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { jsonError, zodErrorResponse } from "@/lib/api-response";
import type { ProfileInputError, ProfileInputErrorCode } from "@/lib/profile/errors";

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
