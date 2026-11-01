import { TRACKER_URL } from "./config.js";

const REQUEST_TIMEOUT_MS = 90000;
const MIN_MAIN_TEXT_CHARS = 800;
const MIN_FRAME_TEXT_CHARS = 200;
const MAX_PAGE_TEXT_CHARS = 120000;
const MAX_JSON_LD = 5;
const VIEWS = ["idle", "loading", "result", "confirm", "error"];

const PLATFORM_LABELS = {
  DJINNI: "Djinni",
  DOU: "DOU",
  LINKEDIN: "LinkedIn",
  ROBOTA_UA: "Robota.ua",
  DIRECT: "Direct",
  OTHER: "Other",
};

const REASON_LABELS = {
  salary: "Salary isn't specified",
  platform: "Platform wasn't recognized",
  company: "Company name is unclear",
  position: "Position title is unclear",
  details: "Saved without AI details, fill in the rest",
  not_vacancy: "This may not be a vacancy",
};

const FALLBACK_LABELS = {
  AI_ACCESS_REQUIRED: "AI access isn't approved yet",
  AI_SUSPENDED: "AI access is suspended",
  VACANCY_LIMIT_REACHED: "the daily AI limit is reached",
  TOKEN_LIMIT_REACHED: "the daily AI limit is reached",
  HR_LIMIT_REACHED: "the daily AI limit is reached",
  page_text_too_short: "the page had too little text",
  extraction_failed: "AI extraction failed",
};

class SignInRequiredError extends Error {}

const $ = (id) => document.getElementById(id);

let currentTab = null;
let capture = null;
let lastConfirm = false;
let createdId = null;

async function collectPage() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let previousLength = -1;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const length = document.body ? document.body.innerText.length : 0;
    if (length > 0 && length === previousLength) break;
    previousLength = length;
    await wait(250);
  }

  const meta = (selector) => {
    const element = document.querySelector(selector);
    const value = element ? element.getAttribute("content") : "";
    return value ? value.trim() : "";
  };

  const bodyText = document.body ? document.body.innerText : "";
  let mainText = "";
  for (const element of document.querySelectorAll("main, [role='main'], article")) {
    const text = element.innerText || "";
    if (text.length > mainText.length) mainText = text;
  }
  const pageText =
    mainText.length >= 800 || mainText.length >= bodyText.length * 0.4 ? mainText : bodyText;

  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => script.textContent || "")
    .filter((text) => text.includes("JobPosting"))
    .map((text) => text.slice(0, 100000))
    .slice(0, 5);

  return {
    isTop: window === window.top,
    title: document.title || "",
    siteName: meta('meta[property="og:site_name"]'),
    description: meta('meta[property="og:description"]') || meta('meta[name="description"]'),
    pageText,
    jsonLd,
  };
}

function mergeFrames(frames, tab) {
  const top = frames.find((frame) => frame.isTop);
  const subframes = frames
    .filter((frame) => !frame.isTop && frame.pageText.length >= MIN_FRAME_TEXT_CHARS)
    .sort((a, b) => b.pageText.length - a.pageText.length);

  const topText = top ? top.pageText : "";
  const pageText =
    topText.length >= MIN_MAIN_TEXT_CHARS || subframes.length === 0
      ? topText
      : [topText, ...subframes.map((frame) => frame.pageText)].filter(Boolean).join("\n\n");

  return {
    url: tab.url,
    title: ((top && top.title) || tab.title || "").slice(0, 500),
    siteName: ((top && top.siteName) || "").slice(0, 200),
    description: ((top && top.description) || "").slice(0, 2000),
    pageText: pageText.slice(0, MAX_PAGE_TEXT_CHARS),
    jsonLd: [...new Set(frames.flatMap((frame) => frame.jsonLd))].slice(0, MAX_JSON_LD),
  };
}

async function readPage(tab) {
  let results = [];
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: collectPage,
    });
  } catch {
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: collectPage,
      });
    } catch {
      results = [];
    }
  }

  return mergeFrames(
    results.map((entry) => entry.result).filter(Boolean),
    tab,
  );
}

async function request(path, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${TRACKER_URL}${path}`, {
      credentials: "include",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("The request took too long. Try again.");
    }
    throw new Error("Couldn't reach Job Tracker. Check your connection.");
  } finally {
    clearTimeout(timer);
  }
}

async function postCapture(payload) {
  const response = await request("/api/applications/from-page", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (response.status === 401) throw new SignInRequiredError();

  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new Error((body && body.error) || `Request failed (${response.status})`);
  }
  return body;
}

async function deleteApplication(id) {
  const response = await request(`/api/applications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
}

function show(name) {
  for (const view of VIEWS) {
    $(`view-${view}`).hidden = view !== name;
  }
}

function renderApplication(application) {
  $("result-title").textContent = `${application.company} · ${application.position}`;
  const platform =
    (application.customPlatform && application.customPlatform.name) ||
    PLATFORM_LABELS[application.platform] ||
    application.platform;
  $("result-sub").textContent = [platform, application.salaryExpectation].filter(Boolean).join(" · ");
}

function renderReasons(application) {
  const reasons = (application.reviewReasons || [])
    .map((reason) =>
      reason === "platform" && application.suggestedPlatformName
        ? `Platform wasn't recognized (looks like ${application.suggestedPlatformName})`
        : REASON_LABELS[reason],
    )
    .filter(Boolean);

  const list = $("result-reasons");
  list.replaceChildren();
  for (const reason of reasons) {
    const item = document.createElement("li");
    item.textContent = reason;
    list.append(item);
  }
  $("result-review").hidden = reasons.length === 0;
}

function showError(error, options = {}) {
  const signInRequired = error instanceof SignInRequiredError;
  $("error-message").textContent = signInRequired
    ? "You're not signed in to Job Tracker. Sign in, then try again."
    : error.message || "Something went wrong.";
  $("sign-in").hidden = !signInRequired;
  $("retry").hidden = options.retry === false;
  show("error");
}

function handleResponse(response) {
  if (response.status === "needs_confirmation") {
    show("confirm");
    return;
  }

  createdId = null;
  renderApplication(response.application);
  $("open-tracker").href = `${TRACKER_URL}/`;
  $("undo").disabled = false;

  if (response.status === "duplicate") {
    $("result-status").textContent = "Already in your tracker";
    $("result-review").hidden = true;
    $("undo").hidden = true;
  } else {
    createdId = response.application.id;
    $("result-status").textContent =
      response.extraction === "ai"
        ? "Added to your tracker"
        : `Added with limited details (${FALLBACK_LABELS[response.fallbackReason] || "AI was unavailable"})`;
    renderReasons(response.application);
    $("undo").hidden = false;
  }

  show("result");
}

async function run(confirmNotVacancy) {
  lastConfirm = confirmNotVacancy;
  show("loading");

  try {
    if (!capture) capture = await readPage(currentTab);
    const payload = confirmNotVacancy ? { ...capture, confirmNotVacancy: true } : capture;
    handleResponse(await postCapture(payload));
  } catch (error) {
    showError(error);
  }
}

async function undo() {
  if (!createdId) return;

  $("undo").disabled = true;
  try {
    await deleteApplication(createdId);
    createdId = null;
    $("result-status").textContent = "Removed from your tracker";
    $("result-review").hidden = true;
    $("undo").hidden = true;
  } catch {
    $("undo").disabled = false;
    $("result-status").textContent = "Couldn't undo. Remove it in the tracker.";
  }
}

async function init() {
  $("sign-in").href = `${TRACKER_URL}/sign-in`;
  $("track").addEventListener("click", () => run(false));
  $("retry").addEventListener("click", () => run(lastConfirm));
  $("confirm-add").addEventListener("click", () => run(true));
  $("confirm-cancel").addEventListener("click", () => window.close());
  $("undo").addEventListener("click", undo);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !/^https?:\/\//.test(tab.url || "")) {
    showError(new Error("Open a job posting page first, then click the extension."), { retry: false });
    return;
  }

  currentTab = tab;
  $("page-title").textContent = tab.title || tab.url;
  $("page-host").textContent = new URL(tab.url).hostname;
  show("idle");
}

init();
