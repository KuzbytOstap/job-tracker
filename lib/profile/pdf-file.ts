import { CV_MAX_BYTES } from "@/lib/profile/limits";

export type PdfFileProblem = "tooLarge" | "notPdf";

export function checkPdfFile(file: { name: string; type: string; size: number }): PdfFileProblem | null {
  const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) return "notPdf";
  if (file.size > CV_MAX_BYTES) return "tooLarge";
  return null;
}
