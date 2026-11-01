import type { Messages } from "@/lib/i18n/messages/types";

export const labels: Messages["labels"] = {
  status: {
    applied: "Подано",
    hrReplied: "Відповів HR",
    hrCall: "Дзвінок з HR",
    techInterview: "Технічна співбесіда",
    testTask: "Тестове завдання",
    offer: "Оффер",
    rejected: "Відмова",
    ignored: "Ігнор",
  },
  platform: {
    djinni: "Djinni",
    dou: "DOU",
    linkedin: "LinkedIn",
    robotaUa: "Robota.ua",
    direct: "Напряму",
    other: "Інша",
  },
  sort: {
    newest: "Спочатку нові",
    oldest: "Спочатку старі",
    activity: "За активністю",
    company: "Компанія А–Я",
  },
};
