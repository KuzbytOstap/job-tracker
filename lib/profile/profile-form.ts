import { z } from "zod";
import type {
  EmploymentTypeValue,
  ProfileDTO,
  SalaryPeriodValue,
  UpdateProfilePayload,
  WorkFormatValue,
} from "@/lib/api-types";
import {
  PROFILE_EMAIL_MAX_LENGTH,
  PROFILE_FIELD_MAX_LENGTH,
  PROFILE_PHONE_MAX_LENGTH,
  SALARY_AMOUNT_MAX,
} from "@/lib/profile/limits";

export const SALARY_PERIOD_VALUES = ["HOUR", "MONTH", "YEAR"] as const satisfies readonly SalaryPeriodValue[];
export const EMPLOYMENT_TYPE_VALUES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
] as const satisfies readonly EmploymentTypeValue[];
export const WORK_FORMAT_VALUES = ["REMOTE", "ONSITE", "HYBRID"] as const satisfies readonly WorkFormatValue[];

const TOO_LONG = "Text is too long";

function text(max: number) {
  return z.string().trim().max(max, TOO_LONG);
}

export const personalFormSchema = z.object({
  firstName: text(PROFILE_FIELD_MAX_LENGTH),
  lastName: text(PROFILE_FIELD_MAX_LENGTH),
  contactEmail: text(PROFILE_EMAIL_MAX_LENGTH).refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Enter a valid email address",
  }),
  phone: text(PROFILE_PHONE_MAX_LENGTH),
  street: text(PROFILE_FIELD_MAX_LENGTH),
  postalCode: text(PROFILE_FIELD_MAX_LENGTH),
  city: text(PROFILE_FIELD_MAX_LENGTH),
  region: text(PROFILE_FIELD_MAX_LENGTH),
  country: text(PROFILE_FIELD_MAX_LENGTH),
});

export type PersonalFormValues = z.infer<typeof personalFormSchema>;

export const searchFormSchema = z
  .object({
    salaryAmount: z
      .string()
      .trim()
      .refine((value) => value === "" || (/^\d{1,10}$/.test(value) && Number(value) <= SALARY_AMOUNT_MAX), {
        message: "Enter a whole number",
      }),
    salaryCurrency: z
      .string()
      .trim()
      .refine((value) => value === "" || /^[A-Za-z]{3}$/.test(value), {
        message: "Use a 3 letter currency code",
      }),
    salaryPeriod: z.enum(["", "HOUR", "MONTH", "YEAR"]),
    employmentTypes: z.array(z.enum(EMPLOYMENT_TYPE_VALUES)),
    workFormats: z.array(z.enum(WORK_FORMAT_VALUES)),
  })
  .superRefine((value, context) => {
    if (value.salaryAmount !== "" && value.salaryPeriod === "") {
      context.addIssue({ code: "custom", path: ["salaryPeriod"], message: "Choose the pay period" });
    }
  });

export type SearchFormValues = z.infer<typeof searchFormSchema>;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function personalFormValuesFromProfile(profile: ProfileDTO): PersonalFormValues {
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    contactEmail: profile.contactEmail ?? "",
    phone: profile.phone ?? "",
    street: profile.address.street ?? "",
    postalCode: profile.address.postalCode ?? "",
    city: profile.address.city ?? "",
    region: profile.address.region ?? "",
    country: profile.address.country ?? "",
  };
}

export function personalFormValuesToPayload(values: PersonalFormValues): UpdateProfilePayload {
  return {
    firstName: emptyToNull(values.firstName),
    lastName: emptyToNull(values.lastName),
    contactEmail: emptyToNull(values.contactEmail),
    phone: emptyToNull(values.phone),
    address: {
      street: emptyToNull(values.street),
      postalCode: emptyToNull(values.postalCode),
      city: emptyToNull(values.city),
      region: emptyToNull(values.region),
      country: emptyToNull(values.country),
    },
  };
}

export function searchFormValuesFromProfile(profile: ProfileDTO): SearchFormValues {
  return {
    salaryAmount: profile.salary.amount === null ? "" : String(profile.salary.amount),
    salaryCurrency: profile.salary.currency ?? "",
    salaryPeriod: profile.salary.period ?? "",
    employmentTypes: profile.employmentTypes,
    workFormats: profile.workFormats,
  };
}

export function searchFormValuesToPayload(values: SearchFormValues): UpdateProfilePayload {
  const currency = emptyToNull(values.salaryCurrency);
  return {
    salary: {
      amount: values.salaryAmount.trim() === "" ? null : Number(values.salaryAmount),
      currency: currency === null ? null : currency.toUpperCase(),
      period: values.salaryPeriod === "" ? null : values.salaryPeriod,
    },
    employmentTypes: values.employmentTypes,
    workFormats: values.workFormats,
  };
}

export function promptToPayload(value: string, defaultPrompt: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" || trimmed === defaultPrompt.trim() ? null : trimmed;
}
