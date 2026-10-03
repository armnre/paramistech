import { describe, expect, it } from 'vitest';
import { headingId, slugify } from './slug';

describe('slugify', () => {
  it('transliterates Persian titles into stable Latin slugs', () => {
    expect(slugify('توسعه نرم‌افزار سازمانی')).toBe('tvsah-nrm-afzar-sazmany');
    expect(slugify('  Hello, World!  ')).toBe('hello-world');
    expect(slugify('---')).toBe('item');
  });

  it('keeps Persian heading ids readable', () => {
    expect(headingId('راهکار ما')).toBe('راهکار-ما');
  });
});
