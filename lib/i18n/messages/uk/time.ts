import type { Messages } from "@/lib/i18n/messages/types";

export const time: Messages["time"] = {
  today: "сьогодні",
  yesterday: "вчора",
  daysAgo: {
    one: "{count} день тому",
    few: "{count} дні тому",
    many: "{count} днів тому",
    other: "{count} дня тому",
  },
  weeksAgo: {
    one: "{count} тиждень тому",
    few: "{count} тижні тому",
    many: "{count} тижнів тому",
    other: "{count} тижня тому",
  },
  monthsAgo: {
    one: "{count} місяць тому",
    few: "{count} місяці тому",
    many: "{count} місяців тому",
    other: "{count} місяця тому",
  },
  unknownDate: "невідома дата",
  unknownDateCapitalized: "Невідома дата",
};
