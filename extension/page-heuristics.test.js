import { describe, expect, it } from "vitest";
import { isPrivatePage, looksLikeJobPage } from "./page-heuristics.js";

const ENGLISH_VACANCY = `
Senior Frontend Engineer at MADIFF. We are looking for an experienced engineer to join our remote team.
Responsibilities: build and maintain the product UI, review code, mentor teammates and work with designers.
Requirements: 5+ years of experience with React and TypeScript, strong communication skills.
We offer a competitive salary, flexible schedule and benefits. Apply today to join our full-time team.
`;

const UKRAINIAN_VACANCY = `
Шукаємо Middle Backend розробника у продуктову компанію. Обов'язки: розробка API, підтримка сервісів, код ревю.
Вимоги: досвід роботи з Node.js від 3 років, англійська від B1. Пропонуємо зарплату від 3000 доларів,
гнучкий графік та медичну страховку. Надсилайте резюме, ми розглянемо кожну вакансію уважно.
`;

const UKRAINIAN_CHAT = `
Привіт! Як справи? Бачила твоє повідомлення вчора, але не встигла відповісти. Завтра зустрічаємось біля метро о шостій,
візьми з собою зарядку і не забудь купити квитки. Ми з Олею будемо чекати біля виходу, подзвони, коли будеш поруч.
`.repeat(2);

function capture(overrides = {}) {
  return { title: "", pageText: "", jsonLd: [], ...overrides };
}

describe("looksLikeJobPage", () => {
  it("accepts any page that exposes JobPosting structured data", () => {
    expect(looksLikeJobPage(capture({ jsonLd: ['{"@type":"JobPosting"}'] }))).toBe(true);
  });

  it("accepts a typical English vacancy", () => {
    expect(looksLikeJobPage(capture({ title: "Senior Frontend Engineer", pageText: ENGLISH_VACANCY }))).toBe(true);
  });

  it("accepts a typical Ukrainian vacancy", () => {
    expect(looksLikeJobPage(capture({ pageText: UKRAINIAN_VACANCY }))).toBe(true);
  });

  it("rejects a page with too little text even when keywords match", () => {
    expect(looksLikeJobPage(capture({ pageText: "Apply now. Requirements: experience. Salary." }))).toBe(false);
  });

  it("rejects a long conversation with no vacancy signals", () => {
    expect(UKRAINIAN_CHAT.length).toBeGreaterThanOrEqual(300);
    expect(looksLikeJobPage(capture({ pageText: UKRAINIAN_CHAT }))).toBe(false);
  });

  it("rejects long text with fewer than three distinct signals", () => {
    const text = `We have great experience in many things. ${"Lorem ipsum dolor sit amet. ".repeat(20)}`;
    expect(looksLikeJobPage(capture({ pageText: text }))).toBe(false);
  });

  it("counts distinct signals, not repeated ones", () => {
    const text = `${"experience ".repeat(60)}`;
    expect(looksLikeJobPage(capture({ pageText: text }))).toBe(false);
  });
});

describe("isPrivatePage", () => {
  it("flags messaging and mail hosts including subdomains", () => {
    expect(isPrivatePage("https://www.instagram.com/direct/inbox/")).toBe(true);
    expect(isPrivatePage("https://mail.google.com/mail/u/0/")).toBe(true);
    expect(isPrivatePage("https://web.whatsapp.com/")).toBe(true);
    expect(isPrivatePage("https://workspace.app.slack.com/client")).toBe(true);
  });

  it("does not flag job sites or lookalike hosts", () => {
    expect(isPrivatePage("https://djinni.co/jobs/123")).toBe(false);
    expect(isPrivatePage("https://notinstagram.com/jobs")).toBe(false);
    expect(isPrivatePage("https://careers.example.com/role")).toBe(false);
  });
});
