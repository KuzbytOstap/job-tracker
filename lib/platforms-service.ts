import { Prisma } from "@/app/generated/prisma/client";
import { Platform, PlatformReviewStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { pickPlatformColor } from "@/lib/ai/platform-color";
import { PLATFORM_LABELS } from "@/lib/labels";
import {
  MAX_CUSTOM_PLATFORMS_PER_USER,
  arePlatformNamesSimilar,
  findSimilarBuiltInPlatform,
  matchBuiltInPlatform,
  normalizePlatformName,
} from "@/lib/platforms";
import { PLATFORM_VALUES } from "@/lib/validation";
import type {
  AdminPlatformProposalDTO,
  CreatePlatformResponse,
  PlatformOptionDTO,
} from "@/lib/api-types";

export type PlatformServiceErrorCode = "LIMIT_REACHED" | "NOT_FOUND" | "SIMILAR_EXISTS";

export class PlatformServiceError extends Error {
  readonly code: PlatformServiceErrorCode;
  readonly similar?: PlatformOptionDTO;

  constructor(code: PlatformServiceErrorCode, message: string, similar?: PlatformOptionDTO) {
    super(message);
    this.name = "PlatformServiceError";
    this.code = code;
    this.similar = similar;
  }
}

export function platformServiceErrorStatus(code: PlatformServiceErrorCode): number {
  if (code === "NOT_FOUND") return 404;
  if (code === "SIMILAR_EXISTS") return 409;
  return 422;
}

const RECENT_APPLICATIONS_FOR_ORDERING = 5;

const CUSTOM_PLATFORM_OPTION_SELECT = {
  id: true,
  name: true,
  colorKey: true,
  isGlobal: true,
} satisfies Prisma.CustomPlatformSelect;

type CustomPlatformOptionRow = Prisma.CustomPlatformGetPayload<{
  select: typeof CUSTOM_PLATFORM_OPTION_SELECT;
}>;

function builtInOption(platform: Platform): PlatformOptionDTO {
  return {
    value: platform,
    label: PLATFORM_LABELS[platform],
    platform,
    customPlatformId: null,
    colorKey: null,
    scope: "builtin",
  };
}

function customOption(row: CustomPlatformOptionRow): PlatformOptionDTO {
  return {
    value: row.id,
    label: row.name,
    platform: Platform.OTHER,
    customPlatformId: row.id,
    colorKey: row.colorKey,
    scope: row.isGlobal ? "global" : "own",
  };
}

function pickMostUsedKey(
  recent: Array<{ platform: Platform; customPlatformId: string | null }>,
): string | null {
  const tallies = new Map<string, { count: number; firstIndex: number }>();

  recent.forEach((application, index) => {
    const key = application.customPlatformId ?? application.platform;
    const tally = tallies.get(key);
    if (tally) {
      tally.count += 1;
    } else {
      tallies.set(key, { count: 1, firstIndex: index });
    }
  });

  let best: { key: string; count: number; firstIndex: number } | null = null;
  for (const [key, tally] of tallies) {
    if (
      best === null ||
      tally.count > best.count ||
      (tally.count === best.count && tally.firstIndex < best.firstIndex)
    ) {
      best = { key, ...tally };
    }
  }

  return best ? best.key : null;
}

export async function listPlatformsForUser(userId: string): Promise<PlatformOptionDTO[]> {
  const [customRows, recent] = await Promise.all([
    prisma.customPlatform.findMany({
      where: { OR: [{ isGlobal: true }, { ownerId: userId }] },
      select: CUSTOM_PLATFORM_OPTION_SELECT,
      orderBy: { name: "asc" },
    }),
    prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: RECENT_APPLICATIONS_FOR_ORDERING,
      select: { platform: true, customPlatformId: true },
    }),
  ]);

  const global = customRows.filter((row) => row.isGlobal).map(customOption);
  const own = customRows.filter((row) => !row.isGlobal).map(customOption);
  const options = [...PLATFORM_VALUES.map(builtInOption), ...global, ...own];

  const topKey = pickMostUsedKey(recent);
  const topIndex = topKey === null ? -1 : options.findIndex((option) => option.value === topKey);
  if (topIndex <= 0) {
    return options;
  }

  return [options[topIndex], ...options.slice(0, topIndex), ...options.slice(topIndex + 1)];
}

export async function findVisibleCustomPlatform(
  userId: string,
  customPlatformId: string,
): Promise<{ id: string } | null> {
  return prisma.customPlatform.findFirst({
    where: { id: customPlatformId, OR: [{ isGlobal: true }, { ownerId: userId }] },
    select: { id: true },
  });
}

type PlatformWriteInput = {
  platform?: Platform;
  customPlatformId?: string | null;
};

type PlatformWriteResult =
  | { ok: true; data: { platform?: Platform; customPlatformId?: string | null } }
  | { ok: false };

export async function resolveApplicationPlatform(
  userId: string,
  input: PlatformWriteInput,
): Promise<PlatformWriteResult> {
  if (typeof input.customPlatformId === "string") {
    const visible = await findVisibleCustomPlatform(userId, input.customPlatformId);
    if (!visible) return { ok: false };
    return { ok: true, data: { platform: Platform.OTHER, customPlatformId: visible.id } };
  }

  if (input.customPlatformId === null || input.platform !== undefined) {
    return {
      ok: true,
      data: {
        ...(input.platform !== undefined ? { platform: input.platform } : {}),
        customPlatformId: null,
      },
    };
  }

  return { ok: true, data: {} };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createCustomPlatform(
  userId: string,
  name: string,
  confirmNew = false,
): Promise<CreatePlatformResponse> {
  const builtIn = matchBuiltInPlatform(name);
  if (builtIn) {
    return { platform: builtInOption(builtIn), created: false };
  }

  const normalizedName = normalizePlatformName(name);
  const visibleWhere: Prisma.CustomPlatformWhereInput = {
    normalizedName,
    OR: [{ isGlobal: true }, { ownerId: userId }],
  };

  const existing = await prisma.customPlatform.findFirst({
    where: visibleWhere,
    orderBy: { isGlobal: "desc" },
    select: CUSTOM_PLATFORM_OPTION_SELECT,
  });
  if (existing) {
    return { platform: customOption(existing), created: false };
  }

  if (!confirmNew) {
    const similarBuiltIn = findSimilarBuiltInPlatform(name);
    if (similarBuiltIn) {
      throw new PlatformServiceError(
        "SIMILAR_EXISTS",
        `A similar platform already exists: ${PLATFORM_LABELS[similarBuiltIn]}.`,
        builtInOption(similarBuiltIn),
      );
    }

    const visibleRows = await prisma.customPlatform.findMany({
      where: { OR: [{ isGlobal: true }, { ownerId: userId }] },
      select: { ...CUSTOM_PLATFORM_OPTION_SELECT, normalizedName: true },
      orderBy: { isGlobal: "desc" },
    });
    const similarCustom = visibleRows.find((row) =>
      arePlatformNamesSimilar(normalizedName, row.normalizedName),
    );
    if (similarCustom) {
      throw new PlatformServiceError(
        "SIMILAR_EXISTS",
        `A similar platform already exists: ${similarCustom.name}.`,
        customOption(similarCustom),
      );
    }
  }

  const ownCount = await prisma.customPlatform.count({
    where: { ownerId: userId, isGlobal: false },
  });
  if (ownCount >= MAX_CUSTOM_PLATFORMS_PER_USER) {
    throw new PlatformServiceError(
      "LIMIT_REACHED",
      `You can add up to ${MAX_CUSTOM_PLATFORMS_PER_USER} custom platforms. Pick an existing one instead.`,
    );
  }

  const alreadyRejected = await prisma.customPlatform.findFirst({
    where: { normalizedName, reviewStatus: PlatformReviewStatus.REJECTED },
    select: { id: true },
  });

  const colorKey = await pickPlatformColor(name);

  try {
    const created = await prisma.customPlatform.create({
      data: {
        name,
        normalizedName,
        colorKey,
        ownerId: userId,
        reviewStatus: alreadyRejected ? PlatformReviewStatus.REJECTED : PlatformReviewStatus.PENDING,
      },
      select: CUSTOM_PLATFORM_OPTION_SELECT,
    });
    return { platform: customOption(created), created: true };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const raced = await prisma.customPlatform.findFirst({
      where: visibleWhere,
      select: CUSTOM_PLATFORM_OPTION_SELECT,
    });
    if (!raced) throw error;
    return { platform: customOption(raced), created: false };
  }
}

export async function listPlatformProposals(): Promise<AdminPlatformProposalDTO[]> {
  const rows = await prisma.customPlatform.findMany({
    where: {
      reviewStatus: PlatformReviewStatus.PENDING,
      isGlobal: false,
      ownerId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      colorKey: true,
      createdAt: true,
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { applications: true } },
    },
  });

  const groups = new Map<string, AdminPlatformProposalDTO>();
  for (const row of rows) {
    if (!row.owner) continue;

    const group = groups.get(row.normalizedName);
    if (group) {
      group.owners.push(row.owner);
      group.applicationCount += row._count.applications;
    } else {
      groups.set(row.normalizedName, {
        id: row.id,
        name: row.name,
        colorKey: row.colorKey,
        owners: [row.owner],
        applicationCount: row._count.applications,
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  return [...groups.values()];
}

export async function decidePlatformProposal(input: {
  proposalId: string;
  adminUserId: string;
  decision: "APPROVED" | "REJECTED";
}): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const proposal = await tx.customPlatform.findFirst({
      where: {
        id: input.proposalId,
        reviewStatus: PlatformReviewStatus.PENDING,
        isGlobal: false,
      },
      select: { id: true, normalizedName: true },
    });
    if (!proposal) {
      throw new PlatformServiceError("NOT_FOUND", "Platform proposal not found");
    }

    const pendingWhere: Prisma.CustomPlatformWhereInput = {
      normalizedName: proposal.normalizedName,
      reviewStatus: PlatformReviewStatus.PENDING,
      isGlobal: false,
    };

    if (input.decision === "REJECTED") {
      await tx.customPlatform.updateMany({
        where: pendingWhere,
        data: {
          reviewStatus: PlatformReviewStatus.REJECTED,
          decidedAt: now,
          decidedByUserId: input.adminUserId,
        },
      });
      return;
    }

    const existingGlobal = await tx.customPlatform.findFirst({
      where: { normalizedName: proposal.normalizedName, isGlobal: true },
      select: { id: true },
    });
    const targetId = existingGlobal ? existingGlobal.id : proposal.id;

    if (!existingGlobal) {
      await tx.customPlatform.update({
        where: { id: proposal.id },
        data: {
          isGlobal: true,
          reviewStatus: PlatformReviewStatus.APPROVED,
          decidedAt: now,
          decidedByUserId: input.adminUserId,
        },
      });
    }

    const duplicates = await tx.customPlatform.findMany({
      where: { ...pendingWhere, id: { not: targetId } },
      select: { id: true },
    });
    const duplicateIds = duplicates.map((duplicate) => duplicate.id);

    if (duplicateIds.length > 0) {
      await tx.jobApplication.updateMany({
        where: { customPlatformId: { in: duplicateIds } },
        data: { customPlatformId: targetId },
      });
      await tx.customPlatform.deleteMany({ where: { id: { in: duplicateIds } } });
    }
  });
}
