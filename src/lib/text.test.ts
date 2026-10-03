import { describe, expect, it } from 'vitest';
import { plainExcerpt } from './text';

describe('plainExcerpt', () => {
  it('strips Markdown syntax and collapses whitespace', () => {
    expect(plainExcerpt('## Title\n\nSome **bold** [link](https://x.y) text')).toBe('Title Some bold link text');
  });

  it('cuts long text at a word boundary with an ellipsis', () => {
    const result = plainExcerpt('word '.repeat(80), 50);
    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.endsWith('…')).toBe(true);
  });

  it('works for Persian text', () => {
    expect(plainExcerpt('## عنوان\n\nمتن **آزمایشی**')).toBe('عنوان متن آزمایشی');
  });
});
