import type { Messages } from "@/lib/i18n/messages/types";

export const review: Messages["review"] = {
  chip: "Потрібні деталі",
  reasons: {
    salary: "Зарплату не вказано",
    platform: "Платформу не розпізнано",
    company: "Назва компанії неясна",
    position: "Назва посади неясна",
    details: "Деталі не заповнилися автоматично",
    notVacancy: "Можливо, це не одна вакансія",
  },
  reminder: {
    ariaLabel: "Відсутні деталі",
    title: "Кілька деталей ще відкриті",
    platformSuggested: "Платформу не розпізнано (схоже на {name})",
    addPlatform: "Додати {name} як платформу",
    hide: "Усе гаразд, сховати",
    hidden: "Нагадування сховано",
    platformSet: "Платформу встановлено: {label}",
  },
};
