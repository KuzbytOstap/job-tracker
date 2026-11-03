import { z } from "zod";
import {
  COVER_LETTER_EXAMPLE_MAX_LENGTH,
  COVER_LETTER_PROMPT_MAX_LENGTH,
  CONTEXT_ITEM_MAX_LENGTH,
  CV_LABEL_MAX_LENGTH,
  CV_LANGUAGE_MAX_LENGTH,
  CV_TEXT_MAX_LENGTH,
  PROFILE_EMAIL_MAX_LENGTH,
  PROFILE_FIELD_MAX_LENGTH,
  PROFILE_PHONE_MAX_LENGTH,
  SALARY_AMOUNT_MAX,
} from "@/lib/profile/limits";

const SALARY_PERIODS = ["HOUR", "MONTH", "YEAR"] as const;
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT"] as const;
const WORK_FORMATS = ["REMOTE", "ONSITE", "HYBRID"] as const;

function nullableText(max: number) {
  return z
    .union([z.string().trim().max(max).transform((value) => (value === "" ? null : value)), z.null()])
    .optional();
}

function uniqueList<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .array(z.enum(values))
    .max(values.length)
    .transform((list) => [...new Set(list)])
    .optional();
}

const contactEmail = z
  .union([
    z.literal("").transform(() => null),
    z.string().trim().max(PROFILE_EMAIL_MAX_LENGTH).pipe(z.email()),
    z.null(),
  ])
  .optional();

const salaryCurrency = z
  .union([
    z.literal("").transform(() => null),
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/),
    z.null(),
  ])
  .optional();

const addressSchema = z
  .object({
    street: nullableText(PROFILE_FIELD_MAX_LENGTH),
    postalCode: nullableText(PROFILE_FIELD_MAX_LENGTH),
    city: nullableText(PROFILE_FIELD_MAX_LENGTH),
    region: nullableText(PROFILE_FIELD_MAX_LENGTH),
    country: nullableText(PROFILE_FIELD_MAX_LENGTH),
  })
  .strict();

const salarySchema = z
  .object({
    amount: z.number().int().nonnegative().max(SALARY_AMOUNT_MAX).nullable().optional(),
    currency: salaryCurrency,
    period: z.enum(SALARY_PERIODS).nullable().optional(),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    firstName: nullableText(PROFILE_FIELD_MAX_LENGTH),
    lastName: nullableText(PROFILE_FIELD_MAX_LENGTH),
    contactEmail,
    phone: nullableText(PROFILE_PHONE_MAX_LENGTH),
    address: addressSchema.optional(),
    salary: salarySchema.optional(),
    employmentTypes: uniqueList(EMPLOYMENT_TYPES),
    workFormats: uniqueList(WORK_FORMATS),
    coverLetterPrompt: nullableText(COVER_LETTER_PROMPT_MAX_LENGTH),
  })
  .strict();

export type UpdateProfileInput = z.output<typeof updateProfileSchema>;

const contextItemText = z.string().trim().min(1).max(CONTEXT_ITEM_MAX_LENGTH);

export const createContextItemSchema = z.object({ text: contextItemText }).strict();
export const updateContextItemSchema = z.object({ text: contextItemText }).strict();

export type ContextItemInput = z.output<typeof createContextItemSchema>;

const cvLabel = z.string().trim().min(1).max(CV_LABEL_MAX_LENGTH);
const cvLanguage = z
  .union([z.string().trim().max(CV_LANGUAGE_MAX_LENGTH).transform((value) => (value === "" ? null : value)), z.null()])
  .optional();

export const createCvMetaSchema = z.object({ label: cvLabel, language: cvLanguage }).strict();

export const updateCvMetaSchema = z
  .object({
    label: cvLabel.optional(),
    language: cvLanguage,
    isPrimary: z.literal(true).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export type UpdateCvMetaInput = z.output<typeof updateCvMetaSchema>;

export const setCvTextSchema = z
  .object({ text: z.string().trim().min(1).max(CV_TEXT_MAX_LENGTH) })
  .strict();

const exampleText = z.string().trim().min(1).max(COVER_LETTER_EXAMPLE_MAX_LENGTH);

export const createExampleSchema = z.object({ vacancyText: exampleText, letterText: exampleText }).strict();

export const updateExampleSchema = z
  .object({ vacancyText: exampleText.optional(), letterText: exampleText.optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export type CreateExampleInput = z.output<typeof createExampleSchema>;
export type UpdateExampleInput = z.output<typeof updateExampleSchema>;
