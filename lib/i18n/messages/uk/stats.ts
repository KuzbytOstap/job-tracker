import type { Messages } from "@/lib/i18n/messages/types";

export const stats: Messages["stats"] = {
  title: "Статистика",
  ariaLabel: "Статистика відгуків",
  funnelAriaLabel: "Воронка відгуків",
  loadFailed: "Не вдалося завантажити статистику.",
  summary: {
    total: "Усього відгуків",
    waiting: "Чекають відповіді",
    replied: "Відповіли та далі",
    interviews: "Співбесіди та далі",
    offers: "Оффери",
  },
  funnel: {
    applied: "Подано",
    replied: "Відповіли",
    interviews: "Співбесіди",
    offers: "Оффери",
  },
  cardAria: {
    one: "{label}: {count} відгук. Переглянути список.",
    few: "{label}: {count} відгуки. Переглянути список.",
    many: "{label}: {count} відгуків. Переглянути список.",
    other: "{label}: {count} відгуку. Переглянути список.",
  },
};
