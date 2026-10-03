import { describe, expect, it } from 'vitest';
import { cachePolicyFor, unhashedPublicFiles } from './cache-policy';

describe('cache policy', () => {
  it('never marks un-hashed brand files immutable', () => {
    for (const path of unhashedPublicFiles) {
      const policy = cachePolicyFor(path);
      expect(policy).toMatch(/max-age=86400/);
      expect(policy).not.toMatch(/immutable/);
    }
  });

  it('never caches HTML in shared caches', () => {
    for (const path of ['/', '/en', '/projects/x', '/en/blog/y', '/admin', '/contact']) {
      expect(cachePolicyFor(path)).toBe('no-store, must-revalidate');
    }
  });

  it('gives feeds a short cache and leaves OG cards to their own header', () => {
    expect(cachePolicyFor('/sitemap.xml')).toBe('public, max-age=600');
    expect(cachePolicyFor('/en/rss.xml')).toBe('public, max-age=600');
    expect(cachePolicyFor('/projects/x/opengraph-image')).toBeNull();
    expect(cachePolicyFor('/en/blog/y/opengraph-image')).toBeNull();
  });
});
