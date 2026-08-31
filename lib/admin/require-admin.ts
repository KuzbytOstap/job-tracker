import { cache } from "react";
import { Role } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { checkSession } from "@/lib/auth";

export type AdminCheck =
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "authorized"; userId: string };

/**
 * Shared server-side admin guard for every admin endpoint. Authorization is
 * decided purely from the persisted `User.role` column, re-read on every
 * call — never from a JWT claim, a session field, or a hardcoded email — so
 * a role change takes effect on the very next request instead of waiting
 * for a new session token. Both "not signed in" and "signed in but not
 * admin" collapse to a generic `forbidden`/`unauthenticated` result here;
 * callers should map `forbidden` to a non-leaky 403 that never reveals
 * whether the target resource exists or what role would be required.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const check = await checkSession();
  if (check.status === "unauthenticated") return { status: "unauthenticated" };
  if (check.status === "forbidden") return { status: "forbidden" };

  const user = await prisma.user.findUnique({
    where: { id: check.session.user.id },
    select: { role: true },
  });

  if (user?.role !== Role.ADMIN) {
    return { status: "forbidden" };
  }

  return { status: "authorized", userId: check.session.user.id };
}

export const getAdminCheckForRequest = cache(requireAdmin);
