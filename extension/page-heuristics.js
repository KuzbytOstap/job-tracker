const PRIVATE_PAGE_HOSTS = [
  "instagram.com",
  "facebook.com",
  "messenger.com",
  "web.whatsapp.com",
  "web.telegram.org",
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "discord.com",
  "app.slack.com",
];

const JOB_SIGNAL_PATTERNS = [
  /vacanc/i,
  /job description/i,
  /responsibilit/i,
  /requirements?/i,
  /qualifications/i,
  /we are looking/i,
  /about the role/i,
  /apply/i,
  /full[- ]time|part[- ]time/i,
  /salary|compensation/i,
  /benefits/i,
  /experience/i,
  /remote|hybrid|on-site/i,
  /вакан/i,
  /обов.язки/i,
  /вимоги/i,
  /шукаємо/i,
  /пропонуємо/i,
  /зарплат/i,
  /досвід/i,
  /stanowisk/i,
  /wymagania/i,
  /obowiązki/i,
  /wynagrodzenie/i,
  /poszukujemy/i,
];

const MIN_JOB_SIGNALS = 3;
const MIN_JOB_TEXT_CHARS = 300;

export function isPrivatePage(url) {
  const host = new URL(url).hostname.toLowerCase();
  return PRIVATE_PAGE_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function looksLikeJobPage(pageCapture) {
  if (pageCapture.jsonLd.length > 0) return true;
  const text = `${pageCapture.title} ${pageCapture.pageText}`;
  const signals = JOB_SIGNAL_PATTERNS.filter((pattern) => pattern.test(text)).length;
  return pageCapture.pageText.length >= MIN_JOB_TEXT_CHARS && signals >= MIN_JOB_SIGNALS;
}
