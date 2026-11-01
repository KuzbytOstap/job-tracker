export const detail = {
  title: "Application details",
  loadFailed: "Couldn't load this application.",
  loadingAria: "Loading application details",
  edit: "Edit",
  autoIgnored: {
    message: {
      one: "Shown under <strong>Ignored</strong> because more than {count} day passed without activity. Its stored status wasn't changed, and no status-change record was created for this.",
      other:
        "Shown under <strong>Ignored</strong> because more than {count} days passed without activity. Its stored status wasn't changed, and no status-change record was created for this.",
    },
    effectiveStatus: "Effective status",
    storedStatus: "Stored status",
    markActive: "Mark as active",
    marking: "Marking active…",
    markedActive: "{company} marked as active",
  },
  sections: {
    pipeline: "Pipeline",
    terminalActions: "Terminal actions",
    testTask: "Test task",
    details: "Details",
    notes: "Notes",
    hrTranscript: "HR call transcript",
    statusHistory: "Status history",
    links: "Links",
    hrQuestions: "HR interview questions",
  },
  fields: {
    vacancyLink: "Vacancy link",
    openLink: "Open link",
    copyLink: "Copy vacancy link",
    salary: "Salary expectation",
    appliedOn: "Applied on",
    lastActivity: "Last activity",
    created: "Created",
  },
  copyNotes: "Copy notes",
  copyTranscript: "Copy HR call transcript",
  history: {
    empty: "No status changes yet.",
  },
  hr: {
    common: "Common questions",
    forVacancy: "For this vacancy",
    copyAll: "Copy all questions",
  },
} as const;
