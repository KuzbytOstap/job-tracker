import type { EmploymentType, Prisma, SalaryPeriod, WorkFormat } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProfileDTO } from "@/lib/api-types";
import { DEFAULT_COVER_LETTER_PROMPT } from "@/lib/profile/default-cover-letter-prompt";
import type { UpdateProfileInput } from "@/lib/profile/schemas";

const PROFILE_SELECT = {
  firstName: true,
  lastName: true,
  contactEmail: true,
  phone: true,
  addressStreet: true,
  addressPostalCode: true,
  addressCity: true,
  addressRegion: true,
  addressCountry: true,
  salaryAmount: true,
  salaryCurrency: true,
  salaryPeriod: true,
  employmentTypes: true,
  workFormats: true,
  coverLetterPrompt: true,
} as const;

type ProfileRow = Prisma.UserProfileGetPayload<{ select: typeof PROFILE_SELECT }>;

type ProfileColumns = Partial<{
  firstName: string | null;
  lastName: string | null;
  contactEmail: string | null;
  phone: string | null;
  addressStreet: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  addressRegion: string | null;
  addressCountry: string | null;
  salaryAmount: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  employmentTypes: EmploymentType[];
  workFormats: WorkFormat[];
  coverLetterPrompt: string | null;
}>;

function toProfileDTO(row: ProfileRow | null): ProfileDTO {
  return {
    firstName: row?.firstName ?? null,
    lastName: row?.lastName ?? null,
    contactEmail: row?.contactEmail ?? null,
    phone: row?.phone ?? null,
    address: {
      street: row?.addressStreet ?? null,
      postalCode: row?.addressPostalCode ?? null,
      city: row?.addressCity ?? null,
      region: row?.addressRegion ?? null,
      country: row?.addressCountry ?? null,
    },
    salary: {
      amount: row?.salaryAmount ?? null,
      currency: row?.salaryCurrency ?? null,
      period: row?.salaryPeriod ?? null,
    },
    employmentTypes: row?.employmentTypes ?? [],
    workFormats: row?.workFormats ?? [],
    coverLetterPrompt: row?.coverLetterPrompt ?? null,
    defaultCoverLetterPrompt: DEFAULT_COVER_LETTER_PROMPT,
  };
}

function assign<K extends keyof ProfileColumns>(columns: ProfileColumns, key: K, value: ProfileColumns[K] | undefined) {
  if (value !== undefined) columns[key] = value;
}

function toColumns(input: UpdateProfileInput): ProfileColumns {
  const columns: ProfileColumns = {};

  assign(columns, "firstName", input.firstName);
  assign(columns, "lastName", input.lastName);
  assign(columns, "contactEmail", input.contactEmail);
  assign(columns, "phone", input.phone);
  assign(columns, "addressStreet", input.address?.street);
  assign(columns, "addressPostalCode", input.address?.postalCode);
  assign(columns, "addressCity", input.address?.city);
  assign(columns, "addressRegion", input.address?.region);
  assign(columns, "addressCountry", input.address?.country);
  assign(columns, "salaryAmount", input.salary?.amount);
  assign(columns, "salaryCurrency", input.salary?.currency);
  assign(columns, "salaryPeriod", input.salary?.period);
  assign(columns, "employmentTypes", input.employmentTypes);
  assign(columns, "workFormats", input.workFormats);
  assign(columns, "coverLetterPrompt", input.coverLetterPrompt);

  return columns;
}

export async function getProfile(userId: string): Promise<ProfileDTO> {
  const row = await prisma.userProfile.findUnique({ where: { userId }, select: PROFILE_SELECT });
  return toProfileDTO(row);
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<ProfileDTO> {
  const columns = toColumns(input);
  const row = await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...columns },
    update: columns,
    select: PROFILE_SELECT,
  });
  return toProfileDTO(row);
}
