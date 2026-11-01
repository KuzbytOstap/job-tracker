import { z } from "zod";
import { PLATFORM_LABELS } from "@/lib/labels";
import { PLATFORM_VALUES } from "@/lib/validation";
import { Platform } from "@/app/generated/prisma/enums";
import type { PlatformOptionDTO } from "@/lib/api-types";

export const PLATFORM_NAME_MAX_LENGTH = 40;
export const MAX_CUSTOM_PLATFORMS_PER_USER = 20;

export function normalizePlatformName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/\.(com|co|ua|org|net|io|ai|dev)$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export const platformNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a platform name")
  .max(PLATFORM_NAME_MAX_LENGTH, `Platform name must be at most ${PLATFORM_NAME_MAX_LENGTH} characters`)
  .refine((value) => normalizePlatformName(value).length > 0, {
    message: "Enter a valid platform name",
  });

const BUILT_IN_BY_NORMALIZED_NAME = new Map<string, Platform>(
  PLATFORM_VALUES.flatMap((platform) => [
    [normalizePlatformName(PLATFORM_LABELS[platform]), platform] as const,
    [normalizePlatformName(platform), platform] as const,
  ]),
);

export function matchBuiltInPlatform(name: string): Platform | null {
  return BUILT_IN_BY_NORMALIZED_NAME.get(normalizePlatformName(name)) ?? null;
}

const MIN_CONTAINED_NAME_LENGTH = 4;
const MIN_TYPO_NAME_LENGTH = 5;

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }

  return row[b.length];
}

export function arePlatformNamesSimilar(normalizedA: string, normalizedB: string): boolean {
  const [shorter, longer] =
    normalizedA.length <= normalizedB.length ? [normalizedA, normalizedB] : [normalizedB, normalizedA];

  if (shorter.length >= MIN_CONTAINED_NAME_LENGTH && longer.includes(shorter)) {
    return true;
  }

  return shorter.length >= MIN_TYPO_NAME_LENGTH && editDistance(normalizedA, normalizedB) <= 1;
}

const SIMILARITY_CHECKED_BUILT_INS = PLATFORM_VALUES.filter(
  (platform) => platform !== Platform.OTHER && platform !== Platform.DIRECT,
);

export function findSimilarBuiltInPlatform(name: string): Platform | null {
  const normalized = normalizePlatformName(name);

  return (
    SIMILARITY_CHECKED_BUILT_INS.find((platform) =>
      [PLATFORM_LABELS[platform], platform].some((candidate) =>
        arePlatformNamesSimilar(normalized, normalizePlatformName(candidate)),
      ),
    ) ?? null
  );
}

export function similarPlatformFromErrorDetails(details: unknown): PlatformOptionDTO | null {
  if (typeof details !== "object" || details === null) return null;

  const { code, similar } = details as { code?: unknown; similar?: unknown };
  if (code !== "SIMILAR_EXISTS" || typeof similar !== "object" || similar === null) return null;

  return similar as PlatformOptionDTO;
}
