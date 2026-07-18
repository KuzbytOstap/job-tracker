"use client";

import { useMutation } from "@tanstack/react-query";
import { extractApplicationFromPosting } from "@/lib/api";
import type {
  ApplicationExtractionInput,
  ApplicationExtractionResponse,
} from "@/lib/application-extraction";

export function useExtractApplication() {
  return useMutation<ApplicationExtractionResponse, unknown, ApplicationExtractionInput>({
    mutationFn: (input) => extractApplicationFromPosting(input),
  });
}
