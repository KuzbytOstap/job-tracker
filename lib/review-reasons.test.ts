import { describe, expect, it } from "vitest";
import { Platform } from "@/app/generated/prisma/enums";
import { getVisibleReviewReasons } from "@/lib/review-reasons";

const base = { salaryExpectation: null, platform: Platform.OTHER };

describe("getVisibleReviewReasons", () => {
  it("returns nothing when there are no stored reasons", () => {
    expect(getVisibleReviewReasons({ ...base })).toEqual([]);
    expect(getVisibleReviewReasons({ ...base, reviewReasons: [] })).toEqual([]);
  });

  it("keeps the salary reason while the salary is empty or blank", () => {
    expect(getVisibleReviewReasons({ ...base, reviewReasons: ["salary"] })).toEqual(["salary"]);
    expect(getVisibleReviewReasons({ ...base, salaryExpectation: "   ", reviewReasons: ["salary"] })).toEqual([
      "salary",
    ]);
  });

  it("hides the salary reason once a salary is set", () => {
    expect(getVisibleReviewReasons({ ...base, salaryExpectation: "$4000", reviewReasons: ["salary"] })).toEqual([]);
  });

  it("keeps the platform reason only for an unrecognized platform", () => {
    expect(getVisibleReviewReasons({ ...base, reviewReasons: ["platform"] })).toEqual(["platform"]);
    expect(getVisibleReviewReasons({ ...base, platform: Platform.DJINNI, reviewReasons: ["platform"] })).toEqual([]);
    expect(getVisibleReviewReasons({ ...base, customPlatformId: "c1", reviewReasons: ["platform"] })).toEqual([]);
  });

  it("keeps reasons that cannot be derived from fields until dismissed", () => {
    expect(
      getVisibleReviewReasons({ ...base, reviewReasons: ["company", "position", "details", "not_vacancy"] }),
    ).toEqual(["company", "position", "details", "not_vacancy"]);
  });

  it("ignores unknown reasons", () => {
    expect(getVisibleReviewReasons({ ...base, reviewReasons: ["nonsense", "salary"] })).toEqual(["salary"]);
  });
});
