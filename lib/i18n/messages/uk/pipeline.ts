import type { Messages } from "@/lib/i18n/messages/types";

export const pipeline: Messages["pipeline"] = {
  ariaLabel: "Етапи відгуку",
  stepCurrent: "{status} (поточний)",
  stepReached: "{status} (пройдено)",
  updating: "Оновлюю статус…",
  movedTo: "Переміщено: {status}",
  moveBackTitle: "Повернути на етап «{status}»?",
  moveBackDescription: "Це поверне {company}, {position} на етап «{status}».",
  moveBack: "Повернути",
};
