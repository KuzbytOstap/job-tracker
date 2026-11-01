import { cache } from "react";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserLocale } from "@/lib/user-settings";
import {
  LOCALE_COOKIE,
  isLocale,
  pickLocaleFromAcceptLanguage,
  type Locale,
} from "@/lib/i18n/locales";

async function getStoredUserLocale(): Promise<Locale | null> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    return userId ? await getUserLocale(userId) : null;
  } catch {
    return null;
  }
}

export const getRequestLocale = cache(async (): Promise<Locale> => {
  const stored = await getStoredUserLocale();
  if (stored) return stored;

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  return pickLocaleFromAcceptLanguage((await headers()).get("accept-language"));
});
