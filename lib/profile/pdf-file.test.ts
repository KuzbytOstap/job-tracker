import { describe, expect, it } from "vitest";
import { checkPdfFile } from "@/lib/profile/pdf-file";
import { CV_MAX_BYTES } from "@/lib/profile/limits";

describe("checkPdfFile", () => {
  it("accepts a PDF by type or by extension", () => {
    expect(checkPdfFile({ name: "cv.pdf", type: "application/pdf", size: 1000 })).toBeNull();
    expect(checkPdfFile({ name: "CV.PDF", type: "", size: 1000 })).toBeNull();
  });

  it("rejects other file types", () => {
    expect(checkPdfFile({ name: "cv.docx", type: "application/msword", size: 1000 })).toBe("notPdf");
    expect(checkPdfFile({ name: "cv.txt", type: "text/plain", size: 10 })).toBe("notPdf");
  });

  it("accepts exactly 4 MB and rejects one byte more", () => {
    expect(checkPdfFile({ name: "cv.pdf", type: "application/pdf", size: CV_MAX_BYTES })).toBeNull();
    expect(checkPdfFile({ name: "cv.pdf", type: "application/pdf", size: CV_MAX_BYTES + 1 })).toBe("tooLarge");
  });

  it("reports the wrong type before the size for a large non PDF", () => {
    expect(checkPdfFile({ name: "photo.png", type: "image/png", size: CV_MAX_BYTES + 1 })).toBe("notPdf");
  });
});
