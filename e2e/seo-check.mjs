// SEO + CSP verification against a running production build (fetch based, no browser).
// Run it through scripts/e2e.sh, which starts a fresh standalone server: the fixtures below are written
// straight to the database, and public content is served from an unstable_cache that only an admin
// write revalidates (the disk copy even survives a restart), so they stay invisible on a warm cache.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import sharp from 'sharp';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
const expectAnalytics = process.env.EXPECT_ANALYTICS === 'true';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const noindexSlug = `noindex-check-${Date.now()}`;
// seed-content.mjs does not create posts, so this script publishes its own fixtures: the feed needs at
// least one indexable post to expose a <pubDate>, and the index needs a post page to check the OG card.
const publicSlug = `seo-check-post-${Date.now()}`;

await pool.query(
  `INSERT INTO posts (slug, title, excerpt, body_md, published, published_at, noindex, is_placeholder)
   VALUES ($1, 'noindex check', 'x', 'body text', true, now(), true, false),
          ($2, $3, 'fixture for the SEO checks', 'body text', true, now(), false, false)`,
  [noindexSlug, publicSlug, `SEO check post ${new Date().toISOString()}`],
);



try {
  const get = async (path) => {
    const response = await fetch(`${baseUrl}${path}`);
    return { response, text: await response.text() };
  };

  // Sitemap -> every detail URL
  const sitemap = (await get('/sitemap.xml')).text;
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  assert.ok(!locations.includes(`/blog/${noindexSlug}`), 'noindex posts must not be in the sitemap');
  await get('/rss.xml'); // first request fills the cache, the second one is served from it
  const rssCached = await get('/rss.xml');
  assert.equal(rssCached.response.status, 200, 'RSS must also work on a cache hit (Date columns)');
  assert.ok(
    rssCached.text.includes('<pubDate>'),
    'RSS items need a pubDate - content is cached (.next/cache/fetch-cache), so rows written straight to the database only show on a server with a cold cache; run this through scripts/e2e.sh',
  );
  assert.ok(!rssCached.text.includes(noindexSlug), 'noindex posts must not be in the RSS feed');

  const paths = [...new Set(['/', '/services', '/projects', '/blog', '/about', '/contact', '/faq', '/privacy', '/terms', ...locations])];
  const titles = new Map();
  const descriptions = new Map();
  let analyticsSeen = false;

  for (const path of paths) {
    const { response, text } = await get(path);
    assert.equal(response.status, 200, `${path} -> ${response.status}`);
    const title = text.match(/<title>([^<]*)<\/title>/)?.[1];
    const description = text.match(/<meta name="description" content="([^"]*)"/)?.[1];
    const canonical = text.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    assert.ok(title, `${path}: missing title`);
    assert.ok(description, `${path}: missing description`);
    assert.ok(canonical, `${path}: missing canonical`);
    assert.equal(new URL(canonical).pathname, path === '/' ? '/' : path.replace(/\/$/, ''), `${path}: canonical mismatch (${canonical})`);
    assert.ok(!titles.has(title), `duplicate title "${title}" on ${path} and ${titles.get(title)}`);
    assert.ok(!descriptions.has(description), `duplicate description on ${path} and ${descriptions.get(description)}`);
    titles.set(title, path);
    descriptions.set(description, path);

    if (path !== '/' && path !== '/en') {
      assert.ok(text.includes('"@type":"BreadcrumbList"'), `${path}: missing BreadcrumbList JSON-LD`);
    }

    // CSP: header with nonce, no unsafe-inline for scripts, every <script> carries the nonce.
    const csp = response.headers.get('content-security-policy') ?? '';
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce, `${path}: CSP header has no nonce`);
    assert.ok(!/script-src[^;]*unsafe-inline/.test(csp), `${path}: script-src allows unsafe-inline`);
    const bare = [...text.matchAll(/<script\b[^>]*>/g)].map((match) => match[0]).filter((tag) => !tag.includes('nonce='));
    assert.deepEqual(bare, [], `${path}: scripts without a nonce`);
    if (text.includes('stats.example.test')) analyticsSeen = true;
  }
  assert.equal(analyticsSeen, expectAnalytics, `analytics script expected=${expectAnalytics}`);
  console.log(`ok  ${paths.length} pages: unique title/description, canonical, breadcrumbs, nonce on every script`);

  const noindexPage = await get(`/blog/${noindexSlug}`);
  assert.match(noindexPage.text, /<meta name="robots" content="noindex/);
  console.log('ok  noindex post is excluded from sitemap and RSS and marked noindex');

  // Open Graph images
  mkdirSync('artifacts', { recursive: true });
  const projectPath = paths.find((path) => path.startsWith('/projects/'));
  const postPath = paths.find((path) => path.startsWith('/blog/') && !path.includes('noindex'));
  assert.ok(projectPath && postPath, 'need one visible project and one post for OG checks');
  for (const [label, path] of [['project', projectPath], ['post', postPath]]) {
    const page = await get(path);
    const ogUrl = page.text.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    assert.ok(ogUrl?.includes('opengraph-image'), `${path}: og:image should be the dynamic card, got ${ogUrl}`);
    const image = await fetch(`${baseUrl}${new URL(ogUrl).pathname}`);
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type') ?? '', /image\/png/);
    const buffer = Buffer.from(await image.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    assert.deepEqual([meta.width, meta.height], [1200, 630]);
    writeFileSync(`artifacts/og-${label}.png`, buffer);
  }
  const missing = await fetch(`${baseUrl}/projects/does-not-exist/opengraph-image`);
  const fallback = Buffer.from(await missing.arrayBuffer());
  assert.equal(missing.status, 200);
  assert.ok(fallback.equals(readFileSync('public/og.png')), 'unknown items must fall back to /og.png');
  console.log('ok  dynamic OG images render (1200x630); unknown items fall back to /og.png');
} finally {
  await pool.query('DELETE FROM posts WHERE slug = ANY($1)', [[noindexSlug, publicSlug]]);
  await pool.end();
}
console.log('SEO CHECK PASSED');
