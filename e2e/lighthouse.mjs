// Lighthouse (mobile emulation, simulated slow 4G) for key pages in both languages against a running build.
// Usage: scripts/e2e.sh e2e/lighthouse.mjs ALLOW_PLACEHOLDERS=true     (writes artifacts/lighthouse.json)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import sharp from 'sharp';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const uploads = process.env.UPLOADS_DIR || '/tmp/paramistech-uploads';
const slug = `lighthouse-post-${Date.now()}`;
const chrome = chromium.executablePath();
mkdirSync('artifacts', { recursive: true });
mkdirSync(uploads, { recursive: true });

// A cover with real image detail, so LCP/image-size behaviour is representative.
const width = 1600, height = 840;
const raw = Buffer.alloc(width * height * 3);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = (y * width + x) * 3;
  raw[i] = (x * 255) / width; raw[i + 1] = 90 + ((y * 120) / height) + ((x * y) % 23); raw[i + 2] = 140 + ((x + y) % 61);
}
const file = `${slug}.webp`;
await sharp(raw, { raw: { width, height, channels: 3 } }).webp({ quality: 74 }).toFile(path.join(uploads, file));
const { rows: [cover] } = await pool.query(
  `INSERT INTO media (path, mime, size, width, height, alt_text) VALUES ($1, 'image/webp', 1, $2, $3, 'Lighthouse cover') RETURNING id`,
  [file, width, height],
);
await pool.query(
  `INSERT INTO posts (slug, title, excerpt, body_md, title_en, excerpt_en, body_md_en, cover_media_id, published, published_at, is_placeholder)
   VALUES ($1, 'نوشتهٔ آزمایشی', 'خلاصهٔ آزمایشی برای سنجش کارایی', $2, 'Sample post for performance testing', 'An excerpt used to measure performance.', $3, $4, true, now(), false)`,
  [slug, '## بخش اول\n\nمتن فارسی آزمایشی.\n\n## بخش دوم\n\nمتن بیشتر.', '## First section\n\nSample English text.\n\n## Second section\n\nMore text.', cover.id],
);

const targets = [
  ['/', 'home'], ['/projects', 'projects'], ['/projects/smart-finance', 'project'], ['/blog', 'blog'], [`/blog/${slug}`, 'post'], ['/contact', 'contact'],
];
const rows = [];
try {
  for (const [locale, prefix] of [['fa', ''], ['en', '/en']]) {
    for (const [route, name] of targets) {
      const url = `${baseUrl}${prefix}${route === '/' ? (prefix ? '' : '/') : route}`;
      const out = `/tmp/lh-${locale}-${name}.json`;
      try {
        execFileSync('npx', ['--yes', 'lighthouse@12.8.2', url, '--quiet', '--chrome-flags=--headless --no-sandbox',
          '--only-categories=performance,accessibility,best-practices,seo', '--output=json', `--output-path=${out}`],
          { stdio: 'pipe', timeout: 150000, env: { ...process.env, CHROME_PATH: chrome } });
        const report = JSON.parse((await import('node:fs')).readFileSync(out, 'utf8'));
        const score = (id) => Math.round(report.categories[id].score * 100);
        const audit = (id) => report.audits[id]?.displayValue ?? '';
        const row = { locale, page: name, url, performance: score('performance'), accessibility: score('accessibility'), bestPractices: score('best-practices'), seo: score('seo'),
          lcp: audit('largest-contentful-paint'), cls: audit('cumulative-layout-shift'), tbt: audit('total-blocking-time'),
          failing: Object.values(report.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual').map((a) => a.id).slice(0, 8) };
        rows.push(row);
        console.log(`${locale} ${name.padEnd(9)} P${row.performance} A${row.accessibility} BP${row.bestPractices} SEO${row.seo}  LCP ${row.lcp} CLS ${row.cls} TBT ${row.tbt}${row.failing.length ? '  <90: ' + row.failing.join(',') : ''}`);
      } catch (error) {
        console.log(`${locale} ${name} FAILED ${String(error.stderr || error.message).split('\n').slice(0, 2).join(' | ')}`);
        rows.push({ locale, page: name, url, error: String(error.message).split('\n')[0] });
      }
      writeFileSync('artifacts/lighthouse.json', JSON.stringify(rows, null, 2));
    }
  }
} finally {
  await pool.query('DELETE FROM posts WHERE slug = $1', [slug]);
  await pool.query('DELETE FROM media WHERE id = $1', [cover.id]);
  await pool.end();
}
const bad = rows.filter((r) => r.error || Math.min(r.performance, r.accessibility, r.bestPractices, r.seo) < 95);
console.log(bad.length ? `BELOW 95 or failed: ${bad.map((r) => `${r.locale}/${r.page}`).join(', ')}` : 'ALL PAGES >= 95 ON ALL FOUR CATEGORIES');
