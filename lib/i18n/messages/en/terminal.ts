export const terminal = {
  restore: "Restore application",
  reject: {
    button: "Reject",
    title: "Mark as rejected?",
    description: "{subject} will be moved to {status}.",
    done: "{subject} marked as rejected",
  },
  ignore: {
    button: "Ignore",
    title: "Mark as ignored?",
    description: "{subject} will be moved to {status}.",
    done: "{subject} marked as ignored",
  },
  restoreDialog: {
    title: "Restore this application?",
    description: "{subject} will be moved out of {status} back to its previous status.",
    confirm: "Restore",
    done: "{subject} restored to {status}",
  },
} as const;
