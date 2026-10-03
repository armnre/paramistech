import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('CSV export', () => {
  it('adds a UTF-8 BOM and escapes quotes', () => {
    const csv = toCsv([{ name: 'علی "نمونه"', email: 'a@example.com' }]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"علی ""نمونه"""');
    expect(csv).toContain('a@example.com');
  });
});
