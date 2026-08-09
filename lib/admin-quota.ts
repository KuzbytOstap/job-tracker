/**
 * Client-side mirror of `utcDateOnly` in `lib/ai/access-control.ts` (which
 * can't be imported here — it pulls in the Prisma client). Used only to
 * decide whether a usage-limit request's `quotaDate` still matches today's
 * UTC quota day for display purposes; the server is the sole authority on
 * whether a request can actually be approved (`STALE_REQUEST`).
 */
export function utcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isUsageRequestStale(quotaDate: string | null, now: Date = new Date()): boolean {
  if (!quotaDate) return true;
  return new Date(quotaDate).getTime() !== utcDateOnly(now).getTime();
}
