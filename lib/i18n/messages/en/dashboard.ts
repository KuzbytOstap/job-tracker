export const dashboard = {
  controls: {
    searchPlaceholder: "Search company or position",
    searchLabel: "Search applications",
    clearSearch: "Clear search",
    sortLabel: "Sort applications",
  },
  dateGroups: {
    today: "Today",
    yesterday: "Yesterday",
    twoDaysAgo: "2 days ago",
    earlier: "Earlier",
  },
  header: {
    tagline: "Keep every opportunity moving",
    add: "Add",
  },
  hero: {
    overview: "Workspace overview",
    eyebrow: "Your pipeline",
    title: "Every application, one clear board",
    subtitle: "Track momentum across every stage without losing the thread.",
  },
  errorState: {
    title: "Something went wrong",
    message: "We couldn't load your applications. Please try again.",
  },
  emptyState: {
    allTitle: "No applications yet",
    allDescription: "Start tracking your job search by adding your first application.",
    filteredTitle: "Nothing here yet",
    filteredDescription: "Applications matching this status will show up here.",
    searchTitle: "No results for \"{query}\"",
    searchDescription: "Try a different company or position.",
    addFirst: "Add your first application",
  },
  dock: {
    focus: "Focus",
    collapsePanel: "Collapse focus panel",
    collapse: "Collapse focus dock",
    expand: "Expand focus dock",
    pipelineFocus: "Pipeline focus",
    interviewStages: "Interview stages",
    recentActivity: "Recent activity",
    noInterviews: "No applications in interview stages.",
    noRecent: "No recent activity.",
  },
} as const;
