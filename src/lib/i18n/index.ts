import { en } from './en';
import { fa, type Dictionary } from './fa';
import type { Locale } from './dictionary';

export type { Dictionary };
export const dictionaries: Record<Locale, Dictionary> = { fa, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Replace {name} placeholders. Unknown placeholders are left visible so they are easy to spot. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Dotted-path lookup used by tooling and tests; returns the key itself when it does not exist. */
export function t(locale: Locale, key: string): unknown {
  const value = key
    .split('.')
    .reduce<unknown>(
      (acc, segment) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[segment] : undefined),
      dictionaries[locale],
    );
  return value === undefined ? key : value;
}
