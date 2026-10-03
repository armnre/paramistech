import { describe, expect, it } from 'vitest';
import { digits, toFa, toLatinDigits } from './digits';

describe('digits', () => {
  it('converts Latin to Persian and back', () => {
    expect(toFa('2026')).toBe('۲۰۲۶');
    expect(toLatinDigits('۲۰۲۶')).toBe('2026');
    expect(toLatinDigits('٢٠٢٦')).toBe('2026');
  });

  it('shows Persian digits only on Persian pages, whatever the stored form', () => {
    expect(digits('fa', 5)).toBe('۵');
    expect(digits('fa', '+۹۸ 21')).toBe('+۹۸ ۲۱');
    expect(digits('en', '+۹۸ ۲۱ ۰۰۰۰')).toBe('+98 21 0000');
    expect(digits('en', 12)).toBe('12');
  });
});
