import type { Messages } from "@/lib/i18n/messages/types";

export const validation: Messages["validation"] = {
  companyRequired: "Вкажіть компанію",
  positionRequired: "Вкажіть посаду",
  invalidUrl: "Введіть коректне посилання http або https",
  invalidDate: "Введіть коректну дату",
  enterUrl: "Введіть посилання",
  jobPostingTooLong: "Текст вакансії надто довгий",
  coverLetterTooLong: "Супровідний лист надто довгий",
  hrTranscriptTooLong: "Запис дзвінка надто довгий",
  platformNameRequired: "Введіть назву платформи",
  platformNameTooLong: "Назва платформи має містити не більше {max} символів",
  platformNameInvalid: "Введіть коректну назву платформи",
};
