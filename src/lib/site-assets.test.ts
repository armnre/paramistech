import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { referencedPublicAssets, siteAssets } from './site-assets';

const publicDir = path.join(process.cwd(), 'public');

describe('public assets referenced by metadata', () => {
  it.each(referencedPublicAssets)('%s exists in public/', (assetPath) => {
    expect(existsSync(path.join(publicDir, assetPath))).toBe(true);
  });

  it('web manifest only references icons that exist', () => {
    const manifest = JSON.parse(readFileSync(path.join(publicDir, 'site.webmanifest'), 'utf8')) as {
      icons: Array<{ src: string }>;
    };
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(existsSync(path.join(publicDir, icon.src))).toBe(true);
    }
  });

  it('og image is 1200x630', async () => {
    const meta = await sharp(path.join(publicDir, siteAssets.ogImage)).metadata();
    expect([meta.width, meta.height]).toEqual([1200, 630]);
  });
});
