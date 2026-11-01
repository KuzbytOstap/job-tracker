import type { Messages } from "@/lib/i18n/messages/types";

export const testTask: Messages["testTask"] = {
  chipDone: "Тестове виконано",
  chipPending: "Тестове очікує",
  branch: {
    title: "Гілка тестового завдання",
    returnToTech: "Повернутися до технічної співбесіди",
    continueToOffer: "Перейти до офферу",
    moveToTestTask: "Перенести в тестове завдання",
  },
  controls: {
    exists: "Для цього відгуку є тестове завдання",
    complete: "Тестове завдання виконано",
    added: "Тестове завдання додано",
    removed: "Тестове завдання прибрано",
    markedDone: "Тестове завдання позначено виконаним",
    markedPending: "Тестове завдання позначено невиконаним",
  },
};
