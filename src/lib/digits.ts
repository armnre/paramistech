import type { Locale } from '@/lib/i18n/dictionary';

const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits to Latin. Numbers in the database stay Latin. */
export const toLatinDigits = (value: string | number) =>
  String(value)
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));

/** Latin digits to Persian digits. */
export const toFa = (value: string | number) =>
  String(value).replace(/[0-9]/g, (digit) => persianDigits[Number(digit)]);

/** Persian digits only on Persian pages; English pages always show Latin digits, whatever was typed in the admin. */
export const digits = (locale: Locale, value: string | number) =>
  locale === 'fa' ? toFa(toLatinDigits(value)) : toLatinDigits(value);
