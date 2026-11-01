import type { Messages } from "@/lib/i18n/messages/types";

export const terminal: Messages["terminal"] = {
  restore: "Відновити відгук",
  reject: {
    button: "Відмова",
    title: "Позначити як відмову?",
    description: "{subject} буде переміщено в «{status}».",
    done: "{subject} позначено як відмову",
  },
  ignore: {
    button: "Ігнорувати",
    title: "Позначити як ігнор?",
    description: "{subject} буде переміщено в «{status}».",
    done: "{subject} позначено як ігнор",
  },
  restoreDialog: {
    title: "Відновити цей відгук?",
    description: "{subject} буде повернено з «{status}» на попередній статус.",
    confirm: "Відновити",
    done: "{subject} відновлено: {status}",
  },
};
