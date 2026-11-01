export const settings = {
  title: "Settings",
  description: "Preferences for your account.",
  loadFailed: "Couldn't load settings.",
  language: {
    title: "Language",
    hint: "Applies across the app and the browser extension.",
  },
  autoIgnore: {
    title: "Auto-ignore",
    description:
      "Applications with no activity for this many days are shown under Ignored. Stored statuses are never changed.",
    enabled: "Move inactive applications to Ignored",
    days: "Days without activity",
    saved: "Auto-ignore settings saved",
    saveFailed: "Couldn't save settings. Try again.",
  },
} as const;
