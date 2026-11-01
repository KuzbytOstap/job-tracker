export const extraction = {
  title: "Fill from job posting",
  subtitle: "Optional, prefills the form below",
  description:
    "Paste a job posting and optionally your cover letter. The extracted values will only prefill the form. Nothing is saved automatically.",
  jobPosting: "Job posting",
  jobPostingPlaceholder: "Paste the job posting text here…",
  coverLetter: "Cover letter (optional)",
  coverLetterPlaceholder: "Paste your cover letter for extra context…",
  analyze: "Analyze posting",
  analyzing: "Analyzing…",
  mockNotice: "Mock result. No external AI request was made.",
  analyzed: "Posting analyzed.",
  genericError: "Couldn't analyze the posting. You can retry or fill the form manually.",
  filledFields: { one: "Filled {count} field.", other: "Filled {count} fields." },
  keptValues: {
    one: "{count} existing value was kept.",
    other: "{count} existing values were kept.",
  },
  platformNotInList:
    "Platform not in your list: <strong>{name}</strong>. Add it and use it for this application?",
  addPlatform: "Add platform",
} as const;
