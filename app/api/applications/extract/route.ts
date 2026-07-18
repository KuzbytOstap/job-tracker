import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import {
  forbiddenResponse,
  jsonError,
  unauthorizedResponse,
  zodErrorResponse,
} from "@/lib/api-response";
import {
  applicationExtractionInputSchema,
  applicationExtractionProviderNameSchema,
  applicationExtractionResultSchema,
  type ApplicationExtractionResponse,
} from "@/lib/application-extraction";
import { ApplicationExtractionProviderError } from "@/lib/ai/application-extraction-provider";
import { getApplicationExtractionProvider } from "@/lib/ai/get-application-extraction-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const parsedInput = applicationExtractionInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    return zodErrorResponse(parsedInput.error);
  }

  let provider;
  try {
    provider = getApplicationExtractionProvider();
  } catch (error) {
    if (error instanceof ApplicationExtractionProviderError) {
      return jsonError(503, "AI extraction is not available.");
    }
    throw error;
  }

  let rawResult;
  try {
    rawResult = await provider.extractApplication(parsedInput.data);
  } catch {
    return jsonError(502, "Couldn't analyze the posting. You can retry or fill the form manually.");
  }

  const parsedResult = applicationExtractionResultSchema.safeParse(rawResult);
  const parsedProviderName = applicationExtractionProviderNameSchema.safeParse(provider.name);
  if (!parsedResult.success || !parsedProviderName.success) {
    return jsonError(502, "Couldn't analyze the posting. You can retry or fill the form manually.");
  }

  const body: ApplicationExtractionResponse = {
    result: parsedResult.data,
    meta: { provider: parsedProviderName.data },
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
