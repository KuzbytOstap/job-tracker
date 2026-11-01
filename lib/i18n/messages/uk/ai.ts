import type { Messages } from "@/lib/i18n/messages/types";

export const ai: Messages["ai"] = {
  access: {
    locked: {
      title: "AI-функції заблоковано",
      description: "Запросіть доступ, щоб розблокувати AI-аналіз вакансій і підказки HR-питань.",
    },
    pending: {
      title: "Запит на AI-доступ очікує",
      description: "Ваш запит чекає на схвалення адміна.",
    },
    suspended: {
      title: "AI-доступ призупинено",
      description: "AI-функції вимкнено для вашого акаунта.",
    },
    request: "Запросити AI-доступ",
    requesting: "Надсилаю запит…",
    requested: "AI-доступ запрошено.",
    requestFailed: "Не вдалося запросити AI-доступ. Спробуйте ще раз.",
  },
  quota: {
    vacancyTitle: "Досягнуто денний ліміт аналізу вакансій",
    hrTitle: "Досягнуто денний ліміт HR-питань",
    tokenTitle: "Досягнуто денний ліміт AI-токенів",
    usage: "Використано {used} / {limit} сьогодні. Оновиться {resetAt}.",
    pending: "Додаткове використання запрошено. Чекає схвалення адміна.",
    request: "Запросити більше",
    requesting: "Надсилаю запит…",
    requested: "Додаткове використання запрошено.",
    requestFailed: "Не вдалося запросити більше використання. Спробуйте ще раз.",
  },
};
