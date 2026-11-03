import type { CvIdentitySuggestionsDTO, ProfileDTO, UpdateProfilePayload } from "@/lib/api-types";

export type IdentityFieldKey = "firstName" | "lastName" | "contactEmail" | "phone" | "city";

export type IdentityRow = {
  key: IdentityFieldKey;
  suggested: string;
  current: string | null;
  defaultChecked: boolean;
};

function clean(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function buildIdentityRows(suggestions: CvIdentitySuggestionsDTO, profile: ProfileDTO): IdentityRow[] {
  const pairs: Array<[IdentityFieldKey, string | null, string | null]> = [
    ["firstName", suggestions.firstName, profile.firstName],
    ["lastName", suggestions.lastName, profile.lastName],
    ["contactEmail", suggestions.email, profile.contactEmail],
    ["phone", suggestions.phone, profile.phone],
    ["city", suggestions.city, profile.address.city],
  ];

  return pairs.flatMap(([key, rawSuggested, rawCurrent]) => {
    const suggested = clean(rawSuggested);
    const current = clean(rawCurrent);
    if (suggested === null || suggested === current) return [];
    return [{ key, suggested, current, defaultChecked: current === null }];
  });
}

export function identityPatch(rows: IdentityRow[], checked: Record<IdentityFieldKey, boolean>): UpdateProfilePayload {
  const patch: UpdateProfilePayload = {};

  for (const row of rows) {
    if (!checked[row.key]) continue;
    if (row.key === "city") {
      patch.address = { ...patch.address, city: row.suggested };
    } else {
      patch[row.key] = row.suggested;
    }
  }

  return patch;
}
