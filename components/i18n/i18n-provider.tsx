"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { updateLocaleSetting } from "@/lib/api";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  type Locale,
} from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  createTranslator,
  defaultTranslator,
  type TranslationParams,
  type Translator,
} from "@/lib/i18n/translate";

export type RichTags = Record<string, (chunk: ReactNode) => ReactNode>;

export type RichTranslator = (key: MessageKey, tags: RichTags, params?: TranslationParams) => ReactNode[];

type I18nContextValue = {
  locale: Locale;
  t: Translator;
  rich: RichTranslator;
  setLocale: (locale: Locale) => void;
};

const TAG_PATTERN = /<(\w+)>(.*?)<\/\1>/g;

function createRichTranslator(t: Translator): RichTranslator {
  return (key, tags, params) => {
    const text = t(key, params);
    const nodes: ReactNode[] = [];
    let cursor = 0;

    for (const match of text.matchAll(TAG_PATTERN)) {
      const [whole, tag, chunk] = match;
      const index = match.index ?? 0;
      if (index > cursor) nodes.push(text.slice(cursor, index));
      const render = tags[tag];
      nodes.push(render ? <span key={index}>{render(chunk)}</span> : chunk);
      cursor = index + whole.length;
    }

    if (cursor < text.length) nodes.push(text.slice(cursor));
    return nodes;
  };
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: defaultTranslator,
  rich: createRichTranslator(defaultTranslator),
  setLocale: () => undefined,
});

type I18nProviderProps = {
  initialLocale: Locale;
  children: ReactNode;
};

export function I18nProvider({ initialLocale, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    updateLocaleSetting(next).catch(() => undefined);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(locale);
    return { locale, t, rich: createRichTranslator(t), setLocale };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function useT(): Translator {
  return useContext(I18nContext).t;
}
