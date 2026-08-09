import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const userUpdateManyMock = vi.fn();
const aiAccessRequestCreateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      updateMany: (...args: unknown[]) => userUpdateManyMock(...args),
    },
    aiAccessRequest: {
      create: (...args: unknown[]) => aiAccessRequestCreateMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

import { AiAccessStatus, AiRequestStatus, AiRequestType, Prisma } from "@/app/generated/prisma/client";
import {
  AiAccessRequestError,
  aiAccessRequestErrorStatus,
  getAiAccessStatus,
  requestAiAccess,
} from "@/lib/ai/access-requests";

beforeEach(() => {
  userFindUniqueMock.mockReset();
  userUpdateManyMock.mockReset();
  aiAccessRequestCreateMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      user: { updateMany: (...args: unknown[]) => userUpdateManyMock(...args) },
      aiAccessRequest: { create: (...args: unknown[]) => aiAccessRequestCreateMock(...args) },
    }),
  );
});

describe("getAiAccessStatus", () => {
  it("returns the stored status for an existing user", async () => {
    userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.APPROVED });
    await expect(getAiAccessStatus("user_1")).resolves.toBe(AiAccessStatus.APPROVED);
  });

  it("defaults to NOT_REQUESTED when the user row is missing", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    await expect(getAiAccessStatus("user_1")).resolves.toBe(AiAccessStatus.NOT_REQUESTED);
  });
});

describe("requestAiAccess", () => {
  it("transitions NOT_REQUESTED to PENDING and creates the AI_ACCESS request", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 1 });
    aiAccessRequestCreateMock.mockResolvedValue({});

    await expect(requestAiAccess("user_1")).resolves.toBe(AiAccessStatus.PENDING);

    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "user_1", aiAccessStatus: AiAccessStatus.NOT_REQUESTED },
      data: { aiAccessStatus: AiAccessStatus.PENDING },
    });
    expect(aiAccessRequestCreateMock).toHaveBeenCalledWith({
      data: { userId: "user_1", type: AiRequestType.AI_ACCESS, status: AiRequestStatus.PENDING },
    });
  });

  it("throws NOT_ELIGIBLE and never creates a request when the user isn't NOT_REQUESTED", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(requestAiAccess("user_1")).rejects.toMatchObject({
      code: "NOT_ELIGIBLE",
    });
    expect(aiAccessRequestCreateMock).not.toHaveBeenCalled();
  });

  it("maps a unique-constraint violation on the request row to NOT_ELIGIBLE", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 1 });
    aiAccessRequestCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(requestAiAccess("user_1")).rejects.toBeInstanceOf(AiAccessRequestError);
    await expect(requestAiAccess("user_1")).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
  });

  it("rethrows unrelated errors", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 1 });
    const unrelated = new Error("db connection reset");
    aiAccessRequestCreateMock.mockRejectedValue(unrelated);

    await expect(requestAiAccess("user_1")).rejects.toBe(unrelated);
  });
});

describe("aiAccessRequestErrorStatus", () => {
  it("maps NOT_ELIGIBLE to 409", () => {
    expect(aiAccessRequestErrorStatus("NOT_ELIGIBLE")).toBe(409);
  });
});
