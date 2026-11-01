export const stats = {
  title: "Statistics",
  ariaLabel: "Application statistics",
  funnelAriaLabel: "Application funnel",
  loadFailed: "Couldn't load statistics.",
  summary: {
    total: "Total applications",
    waiting: "Waiting for reply",
    replied: "Replied or further",
    interviews: "Interviews or further",
    offers: "Offers",
  },
  funnel: {
    applied: "Applied",
    replied: "Replied",
    interviews: "Interviews",
    offers: "Offers",
  },
  cardAria: {
    one: "{label}: {count} application. View list.",
    other: "{label}: {count} applications. View list.",
  },
} as const;
