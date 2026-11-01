import { describe, expect, it } from "vitest";
import { Platform } from "@/app/generated/prisma/enums";
import {
  arePlatformNamesSimilar,
  findSimilarBuiltInPlatform,
  matchBuiltInPlatform,
  normalizePlatformName,
  platformNameSchema,
  similarPlatformFromErrorDetails,
} from "@/lib/platforms";

describe("normalizePlatformName", () => {
  it("lowercases, trims and strips punctuation", () => {
    expect(normalizePlatformName("  LinkedIn  ")).toBe("linkedin");
    expect(normalizePlatformName("We Work Remotely!")).toBe("weworkremotely");
  });

  it("drops a trailing top level domain", () => {
    expect(normalizePlatformName("Djinni.co")).toBe("djinni");
    expect(normalizePlatformName("Robota.ua")).toBe("robota");
  });

  it("keeps non latin letters", () => {
    expect(normalizePlatformName("Робота.UA")).toBe("робота");
  });
});

describe("matchBuiltInPlatform", () => {
  it("matches built-ins by label, key and domain form", () => {
    expect(matchBuiltInPlatform("djinni.co")).toBe(Platform.DJINNI);
    expect(matchBuiltInPlatform("Robota.ua")).toBe(Platform.ROBOTA_UA);
    expect(matchBuiltInPlatform("ROBOTA_UA")).toBe(Platform.ROBOTA_UA);
    expect(matchBuiltInPlatform("other")).toBe(Platform.OTHER);
  });

  it("returns null for an unknown platform", () => {
    expect(matchBuiltInPlatform("Wellfound")).toBeNull();
  });
});

describe("arePlatformNamesSimilar", () => {
  it("treats a name containing another (4+ chars) as similar", () => {
    expect(arePlatformNamesSimilar("djinnipro", "djinni")).toBe(true);
    expect(arePlatformNamesSimilar("work", "workua")).toBe(true);
  });

  it("treats a single typo in a 5+ char name as similar", () => {
    expect(arePlatformNamesSimilar("djini", "djinni")).toBe(true);
  });

  it("does not match very short names or unrelated names", () => {
    expect(arePlatformNamesSimilar("dou", "doux")).toBe(false);
    expect(arePlatformNamesSimilar("abc", "xyz")).toBe(false);
    expect(arePlatformNamesSimilar("djinni", "wellfound")).toBe(false);
  });
});

describe("findSimilarBuiltInPlatform", () => {
  it("finds a similar built-in", () => {
    expect(findSimilarBuiltInPlatform("Djinni Pro")).toBe(Platform.DJINNI);
    expect(findSimilarBuiltInPlatform("LinkedIn Jobs")).toBe(Platform.LINKEDIN);
  });

  it("ignores the generic Direct and Other built-ins", () => {
    expect(findSimilarBuiltInPlatform("Direct Hire")).toBeNull();
    expect(findSimilarBuiltInPlatform("Other jobs")).toBeNull();
  });

  it("returns null when nothing is similar", () => {
    expect(findSimilarBuiltInPlatform("Wellfound")).toBeNull();
  });
});

describe("platformNameSchema", () => {
  it("trims and accepts a normal name", () => {
    expect(platformNameSchema.parse("  Wellfound  ")).toBe("Wellfound");
  });

  it("rejects empty, too long and symbol only names", () => {
    expect(platformNameSchema.safeParse("").success).toBe(false);
    expect(platformNameSchema.safeParse("x".repeat(41)).success).toBe(false);
    expect(platformNameSchema.safeParse("!!!").success).toBe(false);
  });

  it("accepts exactly the maximum length", () => {
    expect(platformNameSchema.safeParse("x".repeat(40)).success).toBe(true);
  });
});

describe("similarPlatformFromErrorDetails", () => {
  const similar = { value: "DJINNI", label: "Djinni", platform: "DJINNI", customPlatformId: null };

  it("extracts the similar platform from a SIMILAR_EXISTS error", () => {
    expect(similarPlatformFromErrorDetails({ code: "SIMILAR_EXISTS", similar })).toEqual(similar);
  });

  it("returns null for other codes or malformed details", () => {
    expect(similarPlatformFromErrorDetails({ code: "LIMIT_REACHED", similar })).toBeNull();
    expect(similarPlatformFromErrorDetails({ code: "SIMILAR_EXISTS", similar: "x" })).toBeNull();
    expect(similarPlatformFromErrorDetails(null)).toBeNull();
    expect(similarPlatformFromErrorDetails("oops")).toBeNull();
  });
});
