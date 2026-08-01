const HOSTNAME_LABELS: Record<string, string> = {
  "dou.ua": "DOU",
  "jobs.dou.ua": "DOU",
  "linkedin.com": "LinkedIn",
  "www.linkedin.com": "LinkedIn",
};

const APPLICATION_FORM_HOSTNAMES = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "smartrecruiters.com",
  "workable.com",
  "bamboohr.com",
  "myworkdayjobs.com",
];

function stripWww(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function isApplicationFormHostname(hostname: string): boolean {
  return APPLICATION_FORM_HOSTNAMES.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export function getUrlLabel(url: string): string {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }

  const bareHostname = stripWww(hostname);

  if (HOSTNAME_LABELS[hostname]) return HOSTNAME_LABELS[hostname];
  if (HOSTNAME_LABELS[bareHostname]) return HOSTNAME_LABELS[bareHostname];
  if (isApplicationFormHostname(hostname)) return "Application form";

  return bareHostname;
}
