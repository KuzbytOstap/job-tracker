import type { Messages } from "@/lib/i18n/messages/types";

export const form: Messages["form"] = {
  addTitle: "Додати відгук",
  addDescription: "Додайте новий відгук на вакансію. Він почне зі статусу «Подано».",
  sections: {
    main: "Основна інформація",
    details: "Деталі відгуку",
    notes: "Нотатки",
    hrTranscript: "Запис дзвінка з HR",
  },
  fields: {
    company: "Компанія",
    position: "Посада",
    platform: "Платформа",
    vacancyLink: "Посилання на вакансію",
    linkPlaceholder: "https://…",
    salary: "Очікувана зарплата",
    salaryPlaceholder: "напр., $4000–5000",
    appliedOn: "Дата відгуку",
    notes: "Нотатки",
    hasTestTask: "У цьому відгуку є тестове завдання",
  },
  platform: {
    selectPlaceholder: "Оберіть платформу",
    addNew: "Додати нову платформу",
    newNameLabel: "Назва нової платформи",
    newNamePlaceholder: "Назва платформи",
    add: "Додати",
    adding: "Додаю…",
    added: "Додано {name}",
    alreadyExists: "{name} уже є, обрано її",
    addFailed: "Не вдалося додати платформу. Спробуйте ще раз.",
    similarExisting: "<strong>{existing}</strong> уже є і схожа на <strong>{name}</strong>.",
    useExisting: "Використати {name}",
    addAnyway: "Усе одно додати {name}",
  },
  actions: {
    add: "Додати відгук",
    adding: "Додаю…",
    saveChanges: "Зберегти зміни",
  },
  toasts: {
    addedToApplied: "{company} додано до «Подано»",
    viewApplied: "Переглянути «Подано»",
    changesSaved: "Зміни збережено",
  },
};
