import {
  ClipboardList,
  EyeOff,
  MailOpen,
  Phone,
  SendHorizontal,
  Trophy,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Status } from "@/app/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/labels";

export type BoardColumnConfig = {
  status: Status;
  label: string;
  slug: string;
  icon: LucideIcon;
  dotClassName: string;
  emptyStateCopy: string;
};

export const BOARD_COLUMNS: BoardColumnConfig[] = [
  {
    status: Status.APPLIED,
    label: STATUS_LABELS.APPLIED,
    slug: "applied",
    icon: SendHorizontal,
    dotClassName: "bg-slate-400",
    emptyStateCopy: "No applications waiting here.",
  },
  {
    status: Status.HR_REPLIED,
    label: STATUS_LABELS.HR_REPLIED,
    slug: "hr-replied",
    icon: MailOpen,
    dotClassName: "bg-blue-400",
    emptyStateCopy: "No replies yet.",
  },
  {
    status: Status.HR_CALL,
    label: STATUS_LABELS.HR_CALL,
    slug: "hr-call",
    icon: Phone,
    dotClassName: "bg-indigo-400",
    emptyStateCopy: "No calls scheduled.",
  },
  {
    status: Status.TECH_INTERVIEW,
    label: STATUS_LABELS.TECH_INTERVIEW,
    slug: "tech-interview",
    icon: Users,
    dotClassName: "bg-violet-400",
    emptyStateCopy: "No interviews lined up.",
  },
  {
    status: Status.TEST_TASK,
    label: STATUS_LABELS.TEST_TASK,
    slug: "test-task",
    icon: ClipboardList,
    dotClassName: "bg-amber-400",
    emptyStateCopy: "No test tasks pending.",
  },
  {
    status: Status.OFFER,
    label: STATUS_LABELS.OFFER,
    slug: "offer",
    icon: Trophy,
    dotClassName: "bg-green-400",
    emptyStateCopy: "No offers yet — keep going.",
  },
  {
    status: Status.REJECTED,
    label: STATUS_LABELS.REJECTED,
    slug: "rejected",
    icon: XCircle,
    dotClassName: "bg-red-400",
    emptyStateCopy: "Nothing here.",
  },
  {
    status: Status.IGNORED,
    label: STATUS_LABELS.IGNORED,
    slug: "ignored",
    icon: EyeOff,
    dotClassName: "bg-gray-400",
    emptyStateCopy: "Nothing has gone quiet.",
  },
];

export const BOARD_COLUMNS_BY_STATUS: Record<Status, BoardColumnConfig> = Object.fromEntries(
  BOARD_COLUMNS.map((column) => [column.status, column]),
) as Record<Status, BoardColumnConfig>;

const BOARD_COLUMNS_BY_SLUG: Record<string, BoardColumnConfig> = Object.fromEntries(
  BOARD_COLUMNS.map((column) => [column.slug, column]),
);

export function getBoardColumnBySlug(slug: string): BoardColumnConfig | undefined {
  return BOARD_COLUMNS_BY_SLUG[slug];
}

export function getSlugForStatus(status: Status): string {
  return BOARD_COLUMNS_BY_STATUS[status].slug;
}

export type BoardColumnBucket<T> = {
  status: Status;
  applications: T[];
};

export function distributeApplicationsIntoColumns<T extends { effectiveStatus: Status }>(
  applications: readonly T[],
): BoardColumnBucket<T>[] {
  const buckets = new Map<Status, T[]>(BOARD_COLUMNS.map((column) => [column.status, []]));

  for (const application of applications) {
    buckets.get(application.effectiveStatus)?.push(application);
  }

  return BOARD_COLUMNS.map((column) => ({
    status: column.status,
    applications: buckets.get(column.status) ?? [],
  }));
}
