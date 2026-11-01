import type { Messages } from "@/lib/i18n/messages/types";

export const dialogs: Messages["dialogs"] = {
  unsaved: {
    title: "Скасувати незбережені зміни?",
    description: "У вас є незбережені зміни. Якщо закрити зараз, їх буде втрачено.",
    confirm: "Скасувати зміни",
    cancel: "Продовжити редагування",
  },
  deleteApplication: {
    button: "Видалити відгук",
    title: "Видалити цей відгук?",
    description: "Це остаточно видалить {company}, {position}. Дію не можна скасувати.",
    confirm: "Видалити",
    deleted: "{company}, {position} видалено",
  },
};
