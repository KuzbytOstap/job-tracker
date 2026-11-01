import { prisma } from "@/lib/prisma";
import { AUTO_IGNORE_AFTER_DAYS } from "@/lib/status";

export async function getAutoIgnoreAfterDays(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { autoIgnoreAfterDays: true },
  });

  return user ? user.autoIgnoreAfterDays : AUTO_IGNORE_AFTER_DAYS;
}

export async function setAutoIgnoreAfterDays(
  userId: string,
  autoIgnoreAfterDays: number | null,
): Promise<number | null> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { autoIgnoreAfterDays },
    select: { autoIgnoreAfterDays: true },
  });

  return user.autoIgnoreAfterDays;
}
