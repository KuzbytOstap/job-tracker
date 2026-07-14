import { Platform, Status } from "@/app/generated/prisma/enums";
import type { SortOption } from "@/lib/validation";

export const STATUS_LABELS: Record<Status, string> = {
  APPLIED: "Applied",
  HR_REPLIED: "HR replied",
  HR_CALL: "HR call",
  TECH_INTERVIEW: "Tech interview",
  TEST_TASK: "Test task",
  OFFER: "Offer",
  REJECTED: "Rejected",
  IGNORED: "Ignored",
};

export const STATUS_BADGE_CLASSES: Record<Status, string> = {
  APPLIED: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  HR_REPLIED: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  HR_CALL: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
  TECH_INTERVIEW: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  TEST_TASK: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  OFFER: "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  IGNORED: "bg-gray-200/70 text-gray-600 dark:bg-gray-400/15 dark:text-gray-400",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  DJINNI: "Djinni",
  DOU: "DOU",
  LINKEDIN: "LinkedIn",
  ROBOTA_UA: "Robota.ua",
  DIRECT: "Direct",
  OTHER: "Other",
};

export const PLATFORM_BADGE_CLASSES: Record<Platform, string> = {
  DJINNI: "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
  DOU: "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
  LINKEDIN: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  ROBOTA_UA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  DIRECT: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300",
  OTHER: "bg-zinc-100 text-zinc-600 dark:bg-zinc-400/15 dark:text-zinc-400",
};

export const SORT_OPTIONS: SortOption[] = ["newest", "oldest", "activity", "company"];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  activity: "Last activity",
  company: "Company A–Z",
};
