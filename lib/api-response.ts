import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { ApiErrorBody } from "@/lib/api-types";

export function jsonError(status: number, message: string, details?: unknown) {
  const body: ApiErrorBody = {
    error: message,
    ...(details !== undefined ? { details } : {}),
  };
  return NextResponse.json(body, { status });
}

export function zodErrorResponse(error: ZodError) {
  return jsonError(400, "Invalid request", error.issues);
}

export function notFoundResponse(resource = "Application") {
  return jsonError(404, `${resource} not found`);
}

export function serverErrorResponse() {
  return jsonError(500, "Internal server error");
}
