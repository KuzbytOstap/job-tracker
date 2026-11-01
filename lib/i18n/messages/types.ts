import type { en } from "@/lib/i18n/messages/en";

export type PluralMessage = {
  one: string;
  other: string;
  few?: string;
  many?: string;
};

type Widen<T> = T extends string
  ? string
  : T extends { readonly one: string; readonly other: string }
    ? PluralMessage
    : { -readonly [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string | PluralMessage ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type MessageKey = Paths<Messages>;
