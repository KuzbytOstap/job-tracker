import { z } from "zod";
import { Platform, Status } from "@/app/generated/prisma/enums";

export const PLATFORM_VALUES = Object.values(Platform) as [Platform, ...Platform[]];
export const STATUS_VALUES = Object.values(Status) as [Status, ...Status[]];

export const STATUS_FILTER_VALUES = [...STATUS_VALUES, "ALL"] as [
  Status | "ALL",
  ...Array<Status | "ALL">,
];

export type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

export const SORT_VALUES = ["newest", "oldest", "activity", "company"] as const;
export type SortOption = (typeof SORT_VALUES)[number];

const platformSchema = z.enum(PLATFORM_VALUES);
const statusSchema = z.enum(STATUS_VALUES);

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function optionalNullableText() {
  return z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    });
}

// Source-text fields accept an explicit `null` on the wire (in addition to
// omission) so an edit save can distinguish "clear this field" from "leave it
// untouched" — see applicationEditFormValuesToUpdatePayload in application-form.ts.
function optionalSourceText(maxLength: number, maxLengthMessage: string) {
  const stringSchema = z.string().trim().max(maxLength, maxLengthMessage);

  return z
    .union([stringSchema, z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      return value.length === 0 ? null : value;
    });
}

const linkSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((value) => value == null || isHttpUrl(value), {
    message: "link must be a valid http or https URL",
  });

export const listApplicationsQuerySchema = z.object({
  status: z.enum(STATUS_FILTER_VALUES).default("ALL"),
  sort: z.enum(SORT_VALUES).default("newest"),
  q: z.string().trim().default(""),
});

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

const baseApplicationFields = {
  company: z.string().trim().min(1, "company is required"),
  position: z.string().trim().min(1, "position is required"),
  platform: platformSchema,
  link: linkSchema,
  salaryExpectation: optionalNullableText(),
  notes: optionalNullableText(),
  jobPostingText: optionalSourceText(50_000, "Job posting text is too long"),
  coverLetterText: optionalSourceText(20_000, "Cover letter text is too long"),
  hasTestTask: z.boolean().optional(),
  testTaskDone: z.boolean().optional(),
  appliedAt: z.coerce.date().optional(),
};

export const createApplicationSchema = z.object(baseApplicationFields).strict();

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = z
  .object({
    ...baseApplicationFields,
    company: baseApplicationFields.company.optional(),
    position: baseApplicationFields.position.optional(),
    platform: platformSchema.optional(),
    status: statusSchema.optional(),
    // Optimistic-concurrency token (not a stored column): the `updatedAt` the
    // client last saw. Stripped from the write and used only to guard against
    // stale updates.
    expectedUpdatedAt: z.coerce.date().optional(),
  })
  .strict();

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
