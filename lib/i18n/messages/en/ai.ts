export const ai = {
  access: {
    locked: {
      title: "AI features are locked",
      description: "Request access to unlock AI-powered posting analysis and HR question suggestions.",
    },
    pending: {
      title: "AI access request pending",
      description: "Your request is awaiting admin approval.",
    },
    suspended: {
      title: "AI access is suspended",
      description: "AI features have been disabled for your account.",
    },
    request: "Request AI access",
    requesting: "Requesting…",
    requested: "AI access requested.",
    requestFailed: "Couldn't request AI access. Try again.",
  },
  quota: {
    vacancyTitle: "Daily vacancy analysis limit reached",
    hrTitle: "Daily HR question limit reached",
    tokenTitle: "Daily AI token limit reached",
    usage: "Used {used} / {limit} today. Resets {resetAt}.",
    pending: "More usage requested. Awaiting admin approval.",
    request: "Request more usage",
    requesting: "Requesting…",
    requested: "Requested more usage.",
    requestFailed: "Couldn't request more usage. Try again.",
  },
} as const;
