import { describe, expect, it } from 'vitest';
import { en } from './en';
import { fa } from './fa';
import { fmt, t } from './index';

function collectKeys(value: unknown, prefix = ''): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap((entry, index) => collectKeys(entry, `${prefix}[${index}]`));
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => collectKeys(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

function collectStrings(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (Array.isArray(value)) return value.flatMap((entry, index) => collectStrings(entry, `${prefix}[${index}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => collectStrings(child, prefix ? `${prefix}.${key}` : key));
  }
  return [];
}

describe('i18n dictionary parity', () => {
  it('fails if a key exists in one dictionary and not the other', () => {
    const faKeys = new Set(collectKeys(fa));
    const enKeys = new Set(collectKeys(en));
    const missingInEn = [...faKeys].filter((key) => !enKeys.has(key));
    const missingInFa = [...enKeys].filter((key) => !faKeys.has(key));
    expect(missingInEn, `keys missing in en: ${missingInEn.join(', ')}`).toEqual([]);
    expect(missingInFa, `keys missing in fa: ${missingInFa.join(', ')}`).toEqual([]);
  });

  it('detects a missing key (the parity check itself works)', () => {
    const broken = { ...en, cta: { title: en.cta.title } };
    const brokenKeys = new Set(collectKeys(broken));
    expect([...collectKeys(fa)].some((key) => !brokenKeys.has(key))).toBe(true);
  });

  it('has no empty strings and no untranslated copies of Persian text in English', () => {
    for (const [key, value] of collectStrings(en)) expect(value.trim().length, key).toBeGreaterThan(0);
    for (const [key, value] of collectStrings(fa)) expect(value.trim().length, key).toBeGreaterThan(0);
    const persian = /[\u0600-\u06FF]/;
    // Allowed: the switcher labels and staff-facing notification line are Persian on purpose.
    const allowed = new Set(['actions.switchLanguage', 'actions.switchLanguageLabel', 'lead.languageLine']);
    const leaked = collectStrings(en).filter(([key, value]) => persian.test(value) && !allowed.has(key));
    expect(leaked, `Persian text in en.ts: ${leaked.map(([key]) => key).join(', ')}`).toEqual([]);
  });

  it('uses the same {placeholders} in both languages', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',');
    const enStrings = new Map(collectStrings(en));
    for (const [key, value] of collectStrings(fa)) {
      expect(placeholders(enStrings.get(key) ?? ''), key).toBe(placeholders(value));
    }
  });
});

describe('helpers', () => {
  it('t() resolves nested paths and array indexes for both locales', () => {
    expect(t('fa', 'site.name')).toBe('ParamisTech');
    expect(t('en', 'hero.benefits.0')).toBe(en.hero.benefits[0]);
    expect(t('fa', 'nope.missing')).toBe('nope.missing');
  });

  it('fmt() fills placeholders and leaves unknown ones visible', () => {
    expect(fmt('Read {title} in {n} min', { title: 'X', n: 3 })).toBe('Read X in 3 min');
    expect(fmt('Hello {who}', {})).toBe('Hello {who}');
  });
});
