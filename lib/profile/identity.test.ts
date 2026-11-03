import { describe, expect, it } from "vitest";
import type { CvIdentitySuggestionsDTO, ProfileDTO } from "@/lib/api-types";
import { buildIdentityRows, identityPatch, type IdentityFieldKey } from "@/lib/profile/identity";

const EMPTY_PROFILE: ProfileDTO = {
  firstName: null,
  lastName: null,
  contactEmail: null,
  phone: null,
  address: { street: null, postalCode: null, city: null, region: null, country: null },
  salary: { amount: null, currency: null, period: null },
  employmentTypes: [],
  workFormats: [],
  coverLetterPrompt: null,
  defaultCoverLetterPrompt: "Default",
};

const SUGGESTIONS: CvIdentitySuggestionsDTO = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+380 50 000 0000",
  city: "Lviv",
};

const ALL_UNCHECKED: Record<IdentityFieldKey, boolean> = {
  firstName: false,
  lastName: false,
  contactEmail: false,
  phone: false,
  city: false,
};

describe("buildIdentityRows", () => {
  it("proposes every field that the CV gave and the profile lacks, all ticked by default", () => {
    const rows = buildIdentityRows(SUGGESTIONS, EMPTY_PROFILE);

    expect(rows.map((row) => row.key)).toEqual(["firstName", "lastName", "contactEmail", "phone", "city"]);
    expect(rows.every((row) => row.defaultChecked)).toBe(true);
    expect(rows.every((row) => row.current === null)).toBe(true);
  });

  it("leaves out fields the CV did not give and fields that already match the profile", () => {
    const rows = buildIdentityRows(
      { ...SUGGESTIONS, lastName: null, phone: "   " },
      { ...EMPTY_PROFILE, firstName: "Ada", address: { ...EMPTY_PROFILE.address, city: " Lviv " } },
    );

    expect(rows.map((row) => row.key)).toEqual(["contactEmail"]);
  });

  it("proposes a different value for a filled field but leaves it unticked", () => {
    const rows = buildIdentityRows(SUGGESTIONS, { ...EMPTY_PROFILE, firstName: "Ada L." });

    const first = rows.find((row) => row.key === "firstName");
    expect(first).toEqual({ key: "firstName", suggested: "Ada", current: "Ada L.", defaultChecked: false });
  });

  it("returns nothing when no suggestion adds anything", () => {
    const empty: CvIdentitySuggestionsDTO = { firstName: null, lastName: null, email: null, phone: null, city: null };

    expect(buildIdentityRows(empty, EMPTY_PROFILE)).toEqual([]);
  });
});

describe("identityPatch", () => {
  it("includes only the ticked fields and puts the city under address", () => {
    const rows = buildIdentityRows(SUGGESTIONS, EMPTY_PROFILE);

    const patch = identityPatch(rows, { ...ALL_UNCHECKED, firstName: true, city: true });

    expect(patch).toEqual({ firstName: "Ada", address: { city: "Lviv" } });
  });

  it("returns an empty patch when nothing is ticked", () => {
    const rows = buildIdentityRows(SUGGESTIONS, EMPTY_PROFILE);

    expect(identityPatch(rows, ALL_UNCHECKED)).toEqual({});
  });

  it("never includes a field that was not proposed even if it is marked", () => {
    const rows = buildIdentityRows({ ...SUGGESTIONS, phone: null }, EMPTY_PROFILE);

    const patch = identityPatch(rows, { ...ALL_UNCHECKED, phone: true });

    expect(patch).toEqual({});
  });
});
