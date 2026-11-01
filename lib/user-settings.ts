import { prisma } from "@/lib/prisma";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { AUTO_IGNORE_AFTER_DAYS } from "@/lib/status";

export async function getAutoIgnoreAfterDays(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { autoIgnoreAfterDays: true },
  });

  return user ? user.autoIgnoreAfterDays : AUTO_IGNORE_AFTER_DAYS;
}

export async function getUserLocale(userId: string): Promise<Locale | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { locale: true },
  });

  const value = user?.locale;
  return isLocale(value) ? value : null;
}

export async function setUserLocale(userId: string, locale: Locale | null): Promise<Locale | null> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { locale },
    select: { locale: true },
  });

  return isLocale(user.locale) ? user.locale : null;
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
