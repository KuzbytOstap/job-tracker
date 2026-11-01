export const dialogs = {
  unsaved: {
    title: "Discard unsaved changes?",
    description: "You have unsaved changes. If you close now, they will be lost.",
    confirm: "Discard changes",
    cancel: "Keep editing",
  },
  deleteApplication: {
    button: "Delete application",
    title: "Delete this application?",
    description: "This permanently deletes {company}, {position}. This can't be undone.",
    confirm: "Delete",
    deleted: "{company}, {position} deleted",
  },
} as const;
