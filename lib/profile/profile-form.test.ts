import { describe, expect, it } from "vitest";
import type { ProfileDTO } from "@/lib/api-types";
import {
  personalFormSchema,
  personalFormValuesFromProfile,
  personalFormValuesToPayload,
  promptToPayload,
  searchFormSchema,
  searchFormValuesFromProfile,
  searchFormValuesToPayload,
} from "@/lib/profile/profile-form";

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
  defaultCoverLetterPrompt: "Default prompt",
};

const FULL_PROFILE: ProfileDTO = {
  ...EMPTY_PROFILE,
  firstName: "Ada",
  lastName: "Lovelace",
  contactEmail: "ada@example.com",
  phone: "+380 50 000 0000",
  address: { street: "1 Main St", postalCode: "79000", city: "Lviv", region: "Lviv", country: "Ukraine" },
  salary: { amount: 5000, currency: "USD", period: "MONTH" },
  employmentTypes: ["FULL_TIME", "CONTRACT"],
  workFormats: ["REMOTE"],
};

describe("personal form values", () => {
  it("turns a profile with nulls into empty strings", () => {
    expect(personalFormValuesFromProfile(EMPTY_PROFILE)).toEqual({
      firstName: "",
      lastName: "",
      contactEmail: "",
      phone: "",
      street: "",
      postalCode: "",
      city: "",
      region: "",
      country: "",
    });
  });

  it("round trips a full profile through the form and back to a payload", () => {
    const values = personalFormValuesFromProfile(FULL_PROFILE);

    expect(personalFormValuesToPayload(values)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      contactEmail: "ada@example.com",
      phone: "+380 50 000 0000",
      address: { street: "1 Main St", postalCode: "79000", city: "Lviv", region: "Lviv", country: "Ukraine" },
    });
  });

  it("maps empty and whitespace only strings to null in the payload", () => {
    const payload = personalFormValuesToPayload({
      ...personalFormValuesFromProfile(EMPTY_PROFILE),
      firstName: "   ",
      city: "",
    });

    expect(payload.firstName).toBeNull();
    expect(payload.address?.city).toBeNull();
  });

  it("validates the email only when one is given", () => {
    const base = personalFormValuesFromProfile(EMPTY_PROFILE);

    expect(personalFormSchema.safeParse({ ...base, contactEmail: "" }).success).toBe(true);
    expect(personalFormSchema.safeParse({ ...base, contactEmail: "ada@example.com" }).success).toBe(true);
    expect(personalFormSchema.safeParse({ ...base, contactEmail: "not-an-email" }).success).toBe(false);
  });

  it("rejects a value over the length limit", () => {
    const base = personalFormValuesFromProfile(EMPTY_PROFILE);

    expect(personalFormSchema.safeParse({ ...base, firstName: "a".repeat(201) }).success).toBe(false);
  });
});

describe("search form values", () => {
  it("turns an empty profile into empty form values", () => {
    expect(searchFormValuesFromProfile(EMPTY_PROFILE)).toEqual({
      salaryAmount: "",
      salaryCurrency: "",
      salaryPeriod: "",
      employmentTypes: [],
      workFormats: [],
    });
  });

  it("round trips salary, employment types and work formats", () => {
    const values = searchFormValuesFromProfile(FULL_PROFILE);

    expect(values.salaryAmount).toBe("5000");
    expect(searchFormValuesToPayload(values)).toEqual({
      salary: { amount: 5000, currency: "USD", period: "MONTH" },
      employmentTypes: ["FULL_TIME", "CONTRACT"],
      workFormats: ["REMOTE"],
    });
  });

  it("maps an unset salary to nulls and uppercases a typed currency", () => {
    expect(searchFormValuesToPayload(searchFormValuesFromProfile(EMPTY_PROFILE)).salary).toEqual({
      amount: null,
      currency: null,
      period: null,
    });
    expect(
      searchFormValuesToPayload({
        ...searchFormValuesFromProfile(EMPTY_PROFILE),
        salaryAmount: "40",
        salaryCurrency: "eur",
        salaryPeriod: "HOUR",
      }).salary,
    ).toEqual({ amount: 40, currency: "EUR", period: "HOUR" });
  });

  it("rejects a negative, fractional or non numeric salary amount", () => {
    const base = searchFormValuesFromProfile(EMPTY_PROFILE);

    for (const salaryAmount of ["-1", "10.5", "abc", "99999999999"]) {
      expect(searchFormSchema.safeParse({ ...base, salaryAmount, salaryPeriod: "MONTH" }).success).toBe(false);
    }
  });

  it("requires a pay period whenever an amount is entered", () => {
    const base = searchFormValuesFromProfile(EMPTY_PROFILE);

    const withoutPeriod = searchFormSchema.safeParse({ ...base, salaryAmount: "5000" });
    expect(withoutPeriod.success).toBe(false);
    if (!withoutPeriod.success) {
      expect(withoutPeriod.error.issues[0]).toMatchObject({ path: ["salaryPeriod"], message: "Choose the pay period" });
    }
    expect(searchFormSchema.safeParse({ ...base, salaryAmount: "5000", salaryPeriod: "YEAR" }).success).toBe(true);
    expect(searchFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a currency that is not three letters", () => {
    const base = searchFormValuesFromProfile(EMPTY_PROFILE);

    expect(searchFormSchema.safeParse({ ...base, salaryCurrency: "dollars" }).success).toBe(false);
    expect(searchFormSchema.safeParse({ ...base, salaryCurrency: "US" }).success).toBe(false);
    expect(searchFormSchema.safeParse({ ...base, salaryCurrency: "usd" }).success).toBe(true);
  });

  it("rejects unknown employment types and work formats", () => {
    const base = searchFormValuesFromProfile(EMPTY_PROFILE);

    expect(searchFormSchema.safeParse({ ...base, employmentTypes: ["INTERN"] }).success).toBe(false);
    expect(searchFormSchema.safeParse({ ...base, workFormats: ["MOON"] }).success).toBe(false);
  });
});

describe("promptToPayload", () => {
  it("returns null for an empty prompt or one equal to the default, so the default keeps applying", () => {
    expect(promptToPayload("", "Default prompt")).toBeNull();
    expect(promptToPayload("   ", "Default prompt")).toBeNull();
    expect(promptToPayload("  Default prompt  ", "Default prompt")).toBeNull();
  });

  it("returns the trimmed custom prompt otherwise", () => {
    expect(promptToPayload("  Be brief.  ", "Default prompt")).toBe("Be brief.");
  });
});
