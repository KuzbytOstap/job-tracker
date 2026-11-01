import type { Messages } from "@/lib/i18n/messages/types";

export const card: Messages["card"] = {
  appliedWhen: "Подано {when}",
  lastActivityWhen: "Остання активність {when}",
  activeWhen: "Активність {when}",
  autoIgnoredCompact: "Автоігнор · {days} дн. без активності",
  autoIgnoredNote: {
    one: "Автоігнор після {count} дня без активності",
    few: "Автоігнор після {count} днів без активності",
    many: "Автоігнор після {count} днів без активності",
    other: "Автоігнор після {count} дня без активності",
  },
  openPosting: "Відкрити вакансію в новій вкладці",
  openPostingFor: "Відкрити вакансію {company} у новій вкладці",
};
