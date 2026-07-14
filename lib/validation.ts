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
  })
  .strict();

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
