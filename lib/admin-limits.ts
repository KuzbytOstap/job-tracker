export type QuotaField = "vacancy" | "hr" | "tokens";

/**
 * Decomposes a user's effective limit for one quota field back into its
 * parts, mirroring the precedence `listAdminUsers` (lib/admin/users.ts)
 * already applied server-side: `effective = (override ?? globalDefault) +
 * bonus`. Used purely for display — to show admins *why* an effective limit
 * is what it is, not to recompute anything authoritative.
 */
export function describeUserLimit(effective: number, override: number | null, globalDefault: number) {
  const base = override ?? globalDefault;
  const bonus = effective - base;
  return { base, bonus, effective, hasOverride: override !== null, hasBonus: bonus > 0 };
}
