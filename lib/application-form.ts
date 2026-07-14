import { z } from "zod";
import { format } from "date-fns";
import { PLATFORM_VALUES } from "@/lib/validation";
import type { ApplicationDTO, CreateApplicationPayload, UpdateApplicationPayload } from "@/lib/api-types";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const applicationFormSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  position: z.string().trim().min(1, "Position is required"),
  platform: z.enum(PLATFORM_VALUES),
  link: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || isHttpUrl(value), {
      message: "Enter a valid http or https URL",
    }),
  salaryExpectation: z.string().trim(),
  notes: z.string().trim(),
  appliedAt: z
    .string()
    .min(1, "Enter a valid date")
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Enter a valid date" }),
  hasTestTask: z.boolean(),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export function defaultApplicationFormValues(): ApplicationFormValues {
  return {
    company: "",
    position: "",
    platform: PLATFORM_VALUES[0],
    link: "",
    salaryExpectation: "",
    notes: "",
    appliedAt: format(new Date(), "yyyy-MM-dd"),
    hasTestTask: false,
  };
}

export function applicationFormValuesFromApplication(application: ApplicationDTO): ApplicationFormValues {
  return {
    company: application.company,
    position: application.position,
    platform: application.platform,
    link: application.link ?? "",
    salaryExpectation: application.salaryExpectation ?? "",
    notes: application.notes ?? "",
    appliedAt: format(new Date(application.appliedAt), "yyyy-MM-dd"),
    hasTestTask: application.hasTestTask,
  };
}

export function applicationFormValuesToCreatePayload(values: ApplicationFormValues): CreateApplicationPayload {
  return {
    company: values.company.trim(),
    position: values.position.trim(),
    platform: values.platform,
    link: values.link.trim() === "" ? undefined : values.link.trim(),
    salaryExpectation: values.salaryExpectation.trim() === "" ? undefined : values.salaryExpectation.trim(),
    notes: values.notes.trim() === "" ? undefined : values.notes.trim(),
    hasTestTask: values.hasTestTask,
    appliedAt: new Date(values.appliedAt).toISOString(),
  };
}

export function applicationFormValuesToUpdatePayload(values: ApplicationFormValues): UpdateApplicationPayload {
  const payload = applicationFormValuesToCreatePayload(values);
  return {
    company: payload.company,
    position: payload.position,
    platform: payload.platform,
    link: payload.link,
    salaryExpectation: payload.salaryExpectation,
    notes: payload.notes,
    appliedAt: payload.appliedAt,
  };
}
