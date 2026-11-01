import type { Messages } from "@/lib/i18n/messages/types";

export const dashboard: Messages["dashboard"] = {
  controls: {
    searchPlaceholder: "Пошук за компанією чи посадою",
    searchLabel: "Пошук відгуків",
    clearSearch: "Очистити пошук",
    sortLabel: "Сортування відгуків",
  },
  dateGroups: {
    today: "Сьогодні",
    yesterday: "Вчора",
    twoDaysAgo: "2 дні тому",
    earlier: "Раніше",
  },
  header: {
    tagline: "Кожна можливість у русі",
    add: "Додати",
  },
  hero: {
    overview: "Огляд робочого простору",
    eyebrow: "Ваш пайплайн",
    title: "Усі відгуки на одній дошці",
    subtitle: "Стежте за прогресом на кожному етапі й нічого не втрачайте.",
  },
  errorState: {
    title: "Щось пішло не так",
    message: "Не вдалося завантажити ваші відгуки. Спробуйте ще раз.",
  },
  emptyState: {
    allTitle: "Відгуків ще немає",
    allDescription: "Почніть відстежувати пошук роботи, додавши перший відгук.",
    filteredTitle: "Тут поки порожньо",
    filteredDescription: "Відгуки з цим статусом з'являться тут.",
    searchTitle: "Нічого не знайдено за запитом «{query}»",
    searchDescription: "Спробуйте іншу компанію чи посаду.",
    addFirst: "Додати перший відгук",
  },
  dock: {
    focus: "Фокус",
    collapsePanel: "Згорнути панель фокусу",
    collapse: "Згорнути док фокусу",
    expand: "Розгорнути док фокусу",
    pipelineFocus: "Фокус на етапах",
    interviewStages: "Етапи співбесід",
    recentActivity: "Остання активність",
    noInterviews: "Немає відгуків на етапах співбесід.",
    noRecent: "Немає недавньої активності.",
  },
};
