import type { SortOption } from "@/lib/validation";

export type DateGroupKey = "today" | "yesterday" | "twoDaysAgo" | "earlier";

export const DATE_GROUP_LABELS: Record<DateGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  twoDaysAgo: "2 days ago",
  earlier: "Earlier",
};

const NEWEST_FIRST_GROUP_ORDER: DateGroupKey[] = ["today", "yesterday", "twoDaysAgo", "earlier"];

export type GroupableApplication = {
  id: string;
  company: string;
  appliedAt: string | Date;
  lastActivityAt: string | Date;
};

export type DateGroup<T> = {
  key: DateGroupKey;
  label: string;
  count: number;
  applications: T[];
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function resolveDateGroupKey(date: Date, now: Date): DateGroupKey {
  const dayDiff = Math.round(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / 86_400_000,
  );

  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff === 2) return "twoDaysAgo";
  return "earlier";
}

function compareApplications<T extends GroupableApplication>(
  a: T,
  b: T,
  sort: SortOption,
): number {
  switch (sort) {
    case "newest":
      return toDate(b.appliedAt).getTime() - toDate(a.appliedAt).getTime();
    case "oldest":
      return toDate(a.appliedAt).getTime() - toDate(b.appliedAt).getTime();
    case "activity":
      return toDate(b.lastActivityAt).getTime() - toDate(a.lastActivityAt).getTime();
    case "company":
      return a.company.localeCompare(b.company, undefined, { sensitivity: "base" });
  }
}

export function groupApplicationsByAppliedDate<T extends GroupableApplication>(
  applications: T[],
  sort: SortOption,
  now: Date = new Date(),
): DateGroup<T>[] {
  const buckets: Record<DateGroupKey, T[]> = {
    today: [],
    yesterday: [],
    twoDaysAgo: [],
    earlier: [],
  };

  for (const application of applications) {
    const key = resolveDateGroupKey(toDate(application.appliedAt), now);
    buckets[key].push(application);
  }

  const order =
    sort === "oldest" ? [...NEWEST_FIRST_GROUP_ORDER].reverse() : NEWEST_FIRST_GROUP_ORDER;

  return order
    .map((key) => ({
      key,
      label: DATE_GROUP_LABELS[key],
      applications: [...buckets[key]].sort((a, b) => compareApplications(a, b, sort)),
      count: buckets[key].length,
    }))
    .filter((group) => group.count > 0);
}
