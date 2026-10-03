import { describe, expect, it } from 'vitest';
import { reviveDates } from './revive-dates';

describe('reviveDates', () => {
  it('restores Date objects after a JSON round trip (what unstable_cache does)', () => {
    const original = {
      post: { slug: 'a', publishedAt: new Date('2026-03-01T10:00:00Z'), updatedAt: new Date('2026-03-02T10:00:00Z') },
      cover: null,
      list: [{ createdAt: new Date('2026-01-01T00:00:00Z') }],
    };
    const cached = JSON.parse(JSON.stringify(original));
    expect(typeof cached.post.publishedAt).toBe('string');

    const revived = reviveDates(cached);
    expect(revived.post.publishedAt).toBeInstanceOf(Date);
    expect(revived.post.publishedAt.toUTCString()).toBe(original.post.publishedAt.toUTCString());
    expect(revived.list[0].createdAt).toBeInstanceOf(Date);
    expect(revived.cover).toBeNull();
    expect(revived.post.slug).toBe('a');
  });

  it('leaves null dates, other strings and existing Dates alone', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(reviveDates({ publishedAt: null, title: '2026-01-01T00:00:00Z', updatedAt: date })).toEqual({
      publishedAt: null,
      title: '2026-01-01T00:00:00Z',
      updatedAt: date,
    });
  });
});
