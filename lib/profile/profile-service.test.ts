import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
    },
  },
}));

import { getProfile, updateProfile } from "@/lib/profile/profile-service";
import { DEFAULT_COVER_LETTER_PROMPT } from "@/lib/profile/default-cover-letter-prompt";

function row(overrides: Record<string, unknown> = {}) {
  return {
    firstName: null,
    lastName: null,
    contactEmail: null,
    phone: null,
    addressStreet: null,
    addressPostalCode: null,
    addressCity: null,
    addressRegion: null,
    addressCountry: null,
    salaryAmount: null,
    salaryCurrency: null,
    salaryPeriod: null,
    employmentTypes: [],
    workFormats: [],
    coverLetterPrompt: null,
    ...overrides,
  };
}

beforeEach(() => {
  findUniqueMock.mockReset();
  upsertMock.mockReset();
});

describe("getProfile", () => {
  it("returns empty defaults and the default prompt when no profile row exists", async () => {
    findUniqueMock.mockResolvedValue(null);

    const profile = await getProfile("user_1");

    expect(findUniqueMock).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user_1" } }));
    expect(profile).toEqual({
      firstName: null,
      lastName: null,
      contactEmail: null,
      phone: null,
      address: { street: null, postalCode: null, city: null, region: null, country: null },
      salary: { amount: null, currency: null, period: null },
      employmentTypes: [],
      workFormats: [],
      coverLetterPrompt: null,
      defaultCoverLetterPrompt: DEFAULT_COVER_LETTER_PROMPT,
    });
  });

  it("maps stored columns to the nested DTO and keeps a custom prompt", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        firstName: "Ada",
        addressCity: "Lviv",
        salaryAmount: 5000,
        salaryCurrency: "USD",
        salaryPeriod: "MONTH",
        employmentTypes: ["FULL_TIME"],
        workFormats: ["REMOTE", "HYBRID"],
        coverLetterPrompt: "Be brief.",
      }),
    );

    const profile = await getProfile("user_1");

    expect(profile.firstName).toBe("Ada");
    expect(profile.address.city).toBe("Lviv");
    expect(profile.salary).toEqual({ amount: 5000, currency: "USD", period: "MONTH" });
    expect(profile.employmentTypes).toEqual(["FULL_TIME"]);
    expect(profile.workFormats).toEqual(["REMOTE", "HYBRID"]);
    expect(profile.coverLetterPrompt).toBe("Be brief.");
    expect(profile.defaultCoverLetterPrompt).toBe(DEFAULT_COVER_LETTER_PROMPT);
  });

  it("never selects the CV or other tables", async () => {
    findUniqueMock.mockResolvedValue(null);

    await getProfile("user_1");

    const args = findUniqueMock.mock.calls[0][0] as { select: Record<string, boolean> };
    expect(Object.keys(args.select)).not.toContain("user");
    expect(Object.keys(args.select)).not.toContain("userId");
  });
});

describe("updateProfile", () => {
  it("upserts scoped by userId and writes only the provided columns", async () => {
    upsertMock.mockResolvedValue(row({ firstName: "Ada", addressCity: "Lviv" }));

    await updateProfile("user_1", { firstName: "Ada", address: { city: "Lviv" } });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        create: { userId: "user_1", firstName: "Ada", addressCity: "Lviv" },
        update: { firstName: "Ada", addressCity: "Lviv" },
      }),
    );
  });

  it("maps salary and list fields to their columns", async () => {
    upsertMock.mockResolvedValue(row());

    await updateProfile("user_1", {
      salary: { amount: 40, currency: "EUR", period: "HOUR" },
      employmentTypes: ["CONTRACT"],
      workFormats: [],
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          salaryAmount: 40,
          salaryCurrency: "EUR",
          salaryPeriod: "HOUR",
          employmentTypes: ["CONTRACT"],
          workFormats: [],
        },
      }),
    );
  });

  it("writes null to reset the cover letter prompt to the default", async () => {
    upsertMock.mockResolvedValue(row());

    await updateProfile("user_1", { coverLetterPrompt: null });

    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ update: { coverLetterPrompt: null } }));
  });

  it("sends an empty update when nothing is provided", async () => {
    upsertMock.mockResolvedValue(row());

    await updateProfile("user_1", {});

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: "user_1" }, update: {} }),
    );
  });
});
