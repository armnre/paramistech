import { describe, expect, it } from 'vitest';
import { ogTitle, ogTitleSize, formatDate } from './og-text';

describe('og text helpers', () => {
  it('scales the title down as it gets longer', () => {
    expect(ogTitleSize('کوتاه')).toBeGreaterThan(ogTitleSize('x'.repeat(40)));
    expect(ogTitleSize('x'.repeat(40))).toBeGreaterThan(ogTitleSize('x'.repeat(70)));
    expect(ogTitleSize('x'.repeat(70))).toBeGreaterThan(ogTitleSize('x'.repeat(120)));
  });

  it('truncates very long titles with an ellipsis', () => {
    const long = 'ا'.repeat(300);
    expect([...ogTitle(long)].length).toBe(110);
    expect(ogTitle(long).endsWith('…')).toBe(true);
    expect(ogTitle('  عنوان  ')).toBe('عنوان');
  });

  it('formats dates in Persian and tolerates missing dates', () => {
    expect(formatDate(null, 'fa')).toBe('');
    expect(formatDate(new Date('2026-03-21T00:00:00Z'), 'fa')).toMatch(/[۰-۹]/);
    expect(formatDate(new Date('2026-03-21T12:00:00Z'), 'en')).toMatch(/March 21, 2026/);
  });
});
