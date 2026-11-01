import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { messages, type MessageKey, type PluralMessage } from "@/lib/i18n/messages";

export type TranslationParams = Record<string, string | number>;

export type Translator = (key: MessageKey, params?: TranslationParams) => string;

function lookup(tree: unknown, key: string): string | PluralMessage | undefined {
  let node: unknown = tree;

  for (const segment of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }

  if (typeof node === "string") return node;
  if (typeof node === "object" && node !== null && "other" in node) return node as PluralMessage;
  return undefined;
}

function interpolate(template: string, params: TranslationParams | undefined): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

export function createTranslator(locale: Locale): Translator {
  const pluralRules = new Intl.PluralRules(locale);

  return (key, params) => {
    const entry = lookup(messages[locale], key) ?? lookup(messages[DEFAULT_LOCALE], key);
    if (entry === undefined) return key;
    if (typeof entry === "string") return interpolate(entry, params);

    const category = pluralRules.select(Number(params?.count ?? 0));
    const form = (entry as Record<string, string | undefined>)[category] ?? entry.other;
    return interpolate(form, params);
  };
}

export const defaultTranslator: Translator = createTranslator(DEFAULT_LOCALE);
