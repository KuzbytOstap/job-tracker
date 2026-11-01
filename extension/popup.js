import { TRACKER_URL } from "./config.js";
import { createTranslator, detectLanguage } from "./strings.js";

const REQUEST_TIMEOUT_MS = 90000;
const MIN_MAIN_TEXT_CHARS = 800;
const MIN_FRAME_TEXT_CHARS = 200;
const MAX_PAGE_TEXT_CHARS = 120000;
const MAX_JSON_LD = 5;
const LOADING_STEP_MS = 2200;
const SPARK_COUNT = 12;
const LOADING_STEPS = ["loadingStep1", "loadingStep2", "loadingStep3"];
const VIEWS = ["idle", "loading", "result", "confirm", "error"];

class AppError extends Error {
  constructor(key, params = {}) {
    super(key);
    this.key = key;
    this.params = params;
  }
}

class SignInRequiredError extends AppError {
  constructor() {
    super("errorSignIn");
  }
}

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let lang = "en";
let t = createTranslator("en");
let currentTab = null;
let capture = null;
let lastConfirm = false;
let loadingTimer = null;

const model = {
  view: "idle",
  response: null,
  error: null,
  retry: true,
  undone: false,
  undoFailed: false,
  createdId: null,
  loadingStepKey: LOADING_STEPS[0],
};

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
    if (error && error.name === "AbortError") throw new AppError("errorTimeout");
    throw new AppError("errorNetwork");
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
    if (body && body.error) throw new Error(body.error);
    throw new AppError("errorRequest", { status: response.status });
  }
  return body;
}

async function deleteApplication(id) {
  const response = await request(`/api/applications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new AppError("errorRequest", { status: response.status });
}

function stopLoadingSteps() {
  if (loadingTimer !== null) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
}

function showLoadingStep(key) {
  model.loadingStepKey = key;
  const text = $("loading-text");
  text.classList.remove("step-in");
  void text.offsetWidth;
  text.textContent = t(key);
  text.classList.add("step-in");
}

function startLoadingSteps() {
  stopLoadingSteps();
  let index = 0;
  showLoadingStep(LOADING_STEPS[0]);
  loadingTimer = setInterval(() => {
    index = Math.min(index + 1, LOADING_STEPS.length - 1);
    showLoadingStep(LOADING_STEPS[index]);
  }, LOADING_STEP_MS);
}

function show(view, state = view) {
  model.view = view;
  for (const name of VIEWS) {
    $(`view-${name}`).hidden = name !== view;
  }
  $("app").dataset.state = state;
  if (view === "loading") {
    startLoadingSteps();
  } else {
    stopLoadingSteps();
  }
}

function setStageCard(label, host) {
  $("monogram").textContent = (label || "J").trim().charAt(0).toUpperCase() || "J";
  $("card-host").textContent = host;
}

function platformLabel(application) {
  if (application.customPlatform && application.customPlatform.name) {
    return application.customPlatform.name;
  }
  const label = t(`platform.${application.platform}`);
  return label === `platform.${application.platform}` ? application.platform : label;
}

function fallbackReasonLabel(reason) {
  const key = `fallback.${reason}`;
  const label = t(key);
  return label === key ? t("fallback.default") : label;
}

function renderReasons(application) {
  const reasons = (application.reviewReasons || [])
    .map((reason) => {
      if (reason === "platform" && application.suggestedPlatformName) {
        return t("reason.platformSuggested", { name: application.suggestedPlatformName });
      }
      const label = t(`reason.${reason}`);
      return label === `reason.${reason}` ? null : label;
    })
    .filter(Boolean);

  const list = $("result-reasons");
  list.replaceChildren();
  for (const reason of reasons) {
    const item = document.createElement("li");
    item.textContent = reason;
    list.append(item);
  }
  $("result-review").hidden = reasons.length === 0 || model.undone;
}

function renderResult() {
  const { response } = model;
  const application = response.application;
  const isDuplicate = response.status === "duplicate";

  $("result-title").textContent = `${application.company} · ${application.position}`;
  $("result-sub").textContent = [platformLabel(application), application.salaryExpectation]
    .filter(Boolean)
    .join(" · ");
  $("open-tracker").href = `${TRACKER_URL}/`;

  let status;
  if (model.undoFailed) status = t("undoFailed");
  else if (model.undone) status = t("statusRemoved");
  else if (isDuplicate) status = t("statusDuplicate");
  else if (response.extraction === "ai") status = t("statusAdded");
  else status = t("statusAddedLimited", { reason: fallbackReasonLabel(response.fallbackReason) });
  $("result-status").textContent = status;

  $("undo").hidden = isDuplicate || model.undone;
  $("undo").disabled = false;

  if (isDuplicate) {
    $("result-review").hidden = true;
  } else {
    renderReasons(application);
  }
}

function renderError() {
  const { error } = model;
  const signInRequired = error instanceof SignInRequiredError;
  $("error-message").textContent =
    error instanceof AppError ? t(error.key, error.params) : error.message || t("errorGeneric");
  $("sign-in").hidden = !signInRequired;
  $("retry").hidden = !model.retry;
}

function showError(error, retry = true) {
  model.error = error;
  model.retry = retry;
  renderError();
  show("error");
}

function handleResponse(response) {
  if (response.status === "needs_confirmation") {
    show("confirm");
    return;
  }

  model.response = response;
  model.undone = false;
  model.undoFailed = false;
  model.createdId = response.status === "created" ? response.application.id : null;
  setStageCard(response.application.company, hostOf(currentTab.url));
  renderResult();
  show("result", response.status === "duplicate" ? "duplicate" : "success");
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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
  if (!model.createdId) return;

  $("undo").disabled = true;
  try {
    await deleteApplication(model.createdId);
    model.createdId = null;
    model.undone = true;
    model.undoFailed = false;
  } catch {
    model.undoFailed = true;
  }
  renderResult();
}

function applyStaticTranslations() {
  document.documentElement.lang = lang;
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nLabel));
  }
  for (const button of document.querySelectorAll("[data-lang]")) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  }
}

function setLanguage(next, persist) {
  lang = next;
  t = createTranslator(next);
  applyStaticTranslations();

  if (model.view === "result") renderResult();
  if (model.view === "error") renderError();
  if (model.view === "loading") $("loading-text").textContent = t(model.loadingStepKey);

  if (persist) {
    try {
      chrome.storage.local.set({ lang: next });
    } catch {
      return;
    }
  }
}

function createSparks() {
  const sparks = $("sparks");
  for (let index = 0; index < SPARK_COUNT; index += 1) {
    const spark = document.createElement("i");
    spark.className = "spark";
    spark.style.setProperty("--a", `${index * (360 / SPARK_COUNT)}deg`);
    sparks.append(spark);
  }
}

function setupTilt() {
  if (reducedMotion.matches) return;

  const stage = $("stage");
  const deck = $("deck");
  let frame = 0;

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      deck.style.setProperty("--ry", `${x * 18}deg`);
      deck.style.setProperty("--rx", `${-y * 14}deg`);
    });
  });

  stage.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frame);
    deck.style.setProperty("--ry", "0deg");
    deck.style.setProperty("--rx", "0deg");
  });
}

async function loadSavedLanguage() {
  try {
    const stored = await chrome.storage.local.get("lang");
    return stored.lang;
  } catch {
    return undefined;
  }
}

async function init() {
  setLanguage(detectLanguage(await loadSavedLanguage()), false);
  createSparks();
  setupTilt();

  $("sign-in").href = `${TRACKER_URL}/sign-in`;
  $("track").addEventListener("click", () => run(false));
  $("retry").addEventListener("click", () => run(lastConfirm));
  $("confirm-add").addEventListener("click", () => run(true));
  $("confirm-cancel").addEventListener("click", () => window.close());
  $("undo").addEventListener("click", undo);
  for (const button of document.querySelectorAll("[data-lang]")) {
    button.addEventListener("click", () => setLanguage(button.dataset.lang, true));
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !/^https?:\/\//.test(tab.url || "")) {
    showError(new AppError("errorOpenPage"), false);
    return;
  }

  currentTab = tab;
  $("page-title").textContent = tab.title || tab.url;
  setStageCard(hostOf(tab.url), hostOf(tab.url));
  show("idle");
}

init();
