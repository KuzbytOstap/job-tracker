import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { analyzeApplicationFit, ApplicationNotFoundError } from "@/lib/fit-analysis-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const check = await checkSession();
  if (check.status === "unauthenticated") return unauthorizedResponse();
  if (check.status === "forbidden") return forbiddenResponse();

  const { id } = await params;

  try {
    const outcome = await analyzeApplicationFit(check.session.user.id, id);
    return NextResponse.json(outcome, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      return notFoundResponse();
    }
    console.error("[fit-analysis] analysis failed", { name: error instanceof Error ? error.name : "unknown" });
    return serverErrorResponse();
  }
}
