import type { Messages } from "@/lib/i18n/messages/types";

export const board: Messages["board"] = {
  pipelineBoard: "Дошка етапів Job Tracker",
  columnAria: "Колонка «{label}»",
  closedApplications: "Закриті відгуки",
  backToBoard: "Назад до дошки",
  filterByStatus: "Фільтр відгуків за статусом",
  all: "Усі",
  empty: {
    applied: "Тут немає відгуків, що чекають.",
    hrReplied: "Відповідей поки немає.",
    hrCall: "Дзвінків не заплановано.",
    techInterview: "Співбесід поки немає.",
    testTask: "Тестових завдань немає.",
    offer: "Офферів ще немає. Не зупиняйтесь.",
    rejected: "Тут порожньо.",
    ignored: "Нічого не затихло.",
  },
};
