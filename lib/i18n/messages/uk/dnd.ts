import type { Messages } from "@/lib/i18n/messages/types";

export const dnd: Messages["dnd"] = {
  instructions:
    "Натисніть пробіл або Enter, щоб підняти картку відгуку. Під час перетягування стрілками перемістіть її в іншу колонку статусу, пробілом або Enter скиньте її там, або натисніть Escape для скасування.",
  theApplication: "відгук",
  pickedUp: "Піднято: {subject}.",
  over: "{subject} над колонкою «{column}».",
  dropped: "{subject} скинуто в колонку «{column}».",
  droppedOutside: "{subject} скинуто поза колонками. Змін не внесено.",
  cancelled: "Переміщення «{subject}» скасовано.",
  handleLabel: "Перемістити відгук {company}",
  moveTitle: "Перенести в «{status}»?",
  moveDescription: "{subject} буде перенесено в «{status}».",
  move: "Перенести",
};
