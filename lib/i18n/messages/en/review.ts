export const review = {
  chip: "Needs details",
  reasons: {
    salary: "Salary isn't specified",
    platform: "Platform isn't recognized",
    company: "Company name looks unclear",
    position: "Position title looks unclear",
    details: "Details weren't filled in automatically",
    notVacancy: "This may not be a single vacancy",
  },
  reminder: {
    ariaLabel: "Missing details",
    title: "A few details are still open",
    platformSuggested: "Platform isn't recognized (looks like {name})",
    addPlatform: "Add {name} as platform",
    hide: "It's fine, hide this",
    hidden: "Reminder hidden",
    platformSet: "Platform set to {label}",
  },
} as const;
