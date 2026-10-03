// Production-mode verification against a running standalone build.
// EXPECT_PLACEHOLDERS=false (default) simulates production with ALLOW_PLACEHOLDERS unset.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
const expectPlaceholders = process.env.EXPECT_PLACEHOLDERS === 'true';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const get = (path, init) => fetch(`${baseUrl}${path}`, { redirect: 'manual', ...init });
const results = [];
const ok = (message) => { results.push(message); console.log(`ok  ${message}`); };

try {
  // 1. Every public asset URL referenced by metadata or the manifest answers 200.
  const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8'));
  const assetPaths = [
    '/og.png', '/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png',
    '/site.webmanifest', '/icon.svg', '/robots.txt', '/sitemap.xml', '/rss.xml',
    ...manifest.icons.map((icon) => icon.src),
  ];
  for (const path of new Set(assetPaths)) {
    const response = await get(path);
    assert.equal(response.status, 200, `${path} -> ${response.status}`);
    await response.arrayBuffer();
  }
  ok(`${new Set(assetPaths).size} public asset URLs return 200`);

  // 2. Security headers on public and admin pages.
  for (const path of ['/', '/blog', '/admin']) {
    const response = await get(path);
    const h = (name) => response.headers.get(name) ?? '';
    assert.equal(h('strict-transport-security'), '', `${path}: HSTS must NOT be sent over plain http`);
    assert.equal(h('x-content-type-options'), 'nosniff', `${path}: nosniff`);
    assert.ok(h('referrer-policy'), `${path}: referrer-policy`);
    assert.ok(h('permissions-policy'), `${path}: permissions-policy`);
    assert.equal(h('x-frame-options'), 'DENY', `${path}: x-frame-options`);
    assert.ok(/frame-ancestors 'none'/.test(h('content-security-policy')), `${path}: CSP frame-ancestors`);
    assert.equal(h('x-powered-by'), '', `${path}: x-powered-by must be absent`);
    await response.text();
  }
  const viaProxy = await get('/', { headers: { 'x-forwarded-proto': 'https' } });
  assert.match(viaProxy.headers.get('strict-transport-security') ?? '', /max-age=63072000/, 'HSTS must be sent when the proxy says https');
  await viaProxy.text();
  ok('nosniff, referrer, permissions, frame and CSP present; HSTS only with X-Forwarded-Proto https; no x-powered-by');

  // 2b. Cache policy per resource class.
  const cache = async (path) => {
    const response = await get(path);
    await response.arrayBuffer();
    return response.headers.get('cache-control') ?? '';
  };
  assert.equal(await cache('/'), 'no-store, must-revalidate', 'HTML must not be cached');
  for (const file of ['/og.png', '/favicon.ico', '/apple-touch-icon.png', '/icon-192.png', '/site.webmanifest']) {
    const policy = await cache(file);
    assert.match(policy, /max-age=86400/, `${file}: ${policy}`);
    assert.doesNotMatch(policy, /immutable/, `${file} has no content hash, so it must not be immutable`);
  }
  const homeHtml = await (await get('/')).text();
  const chunk = homeHtml.match(/\/_next\/static\/chunks\/[A-Za-z0-9_-]+\.js/)?.[0];
  assert.ok(chunk, 'home page should reference a hashed chunk');
  assert.match(await cache(chunk), /immutable/, 'hashed /_next/static chunks must be immutable');
  assert.match(await cache('/sitemap.xml'), /max-age=600/);
  ok('cache: HTML no-store, brand files 1 day (not immutable), hashed chunks immutable, feeds 10 min');

  // 3. Anonymous access to admin.
  const adminPage = await (await get('/admin')).text();
  assert.ok(adminPage.includes('id="admin-email"'), '/admin must show the login form to anonymous users');
  const usersPage = await (await get('/admin/users')).text();
  assert.ok(usersPage.includes('id="admin-email"') && !usersPage.includes('createUser'), '/admin/users must not render for anonymous users');
  assert.equal((await get('/admin/leads/export')).status, 401);
  const origin = new URL(baseUrl).origin;
  assert.equal((await get('/api/admin/preview', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: '{"markdown":"x"}' })).status, 403);
  const loginBody = JSON.stringify({ email: 'admin@example.com', password: 'whatever-password' });
  assert.equal((await get('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: loginBody })).status, 403, 'login without Origin must be rejected');
  assert.equal((await get('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: loginBody })).status, 403, 'login from a foreign Origin must be rejected');
  ok('anonymous: login form only, export 401, preview 403, login without/with foreign Origin 403');

  // 4. Placeholder visibility.
  const { rows: [counts] } = await pool.query(`select
    (select count(*) from projects where is_placeholder)::int as projects,
    (select count(*) from services where is_placeholder)::int as services,
    (select count(*) from faqs where is_placeholder)::int as faqs,
    (select count(*) from settings where is_placeholder)::int as settings`);
  assert.ok(counts.projects > 0 && counts.services > 0 && counts.faqs > 0, `seed rows must exist in the DB: ${JSON.stringify(counts)}`);
  const home = await (await get('/')).text();
  const projects = await (await get('/projects')).text();
  const services = await (await get('/services')).text();
  const faq = await (await get('/faq')).text();
  const contact = await (await get('/contact')).text();
  const smartFinance = (await get('/projects/smart-finance')).status;
  const sitemap = await (await get('/sitemap.xml')).text();
  if (expectPlaceholders) {
    assert.ok(projects.includes('اپلیکیشن مالی هوشمند') && services.includes('توسعه اپلیکیشن موبایل') && faq.includes('زمان انجام پروژه'));
    assert.equal(smartFinance, 200);
    ok('ALLOW_PLACEHOLDERS=true: sample rows are visible');
  } else {
    assert.ok(!projects.includes('اپلیکیشن مالی هوشمند') && projects.includes('هنوز پروژه‌ای منتشر نشده است'), '/projects must hide samples');
    assert.ok(services.includes('هنوز خدمتی منتشر نشده است') && !services.includes('توسعه اپلیکیشن موبایل'), '/services must hide samples');
    assert.ok(faq.includes('هنوز پرسشی منتشر نشده است'), '/faq must hide samples');
    assert.ok(!home.includes('id="services"') && !home.includes('id="projects"'), 'home must omit empty services/projects sections');
    assert.ok(!contact.includes('hello@paramistech.example') && !home.includes('hello@paramistech.example'), 'placeholder contact details must be hidden');
    assert.equal(smartFinance, 404, 'sample project page must be 404');
    assert.ok(!sitemap.includes('smart-finance') && !sitemap.includes('mobile-apps'), 'sitemap must not list samples');
    // The English sample rows (also is_placeholder) must be just as invisible under /en.
    const enProjects = await (await get('/en/projects')).text();
    const enServices = await (await get('/en/services')).text();
    const enFaq = await (await get('/en/faq')).text();
    const enContact = await (await get('/en/contact')).text();
    assert.ok(enProjects.includes('No projects published yet.') && !enProjects.includes('Smart finance app'), '/en/projects must hide samples');
    assert.ok(enServices.includes('No services published yet.') && !enServices.includes('Mobile applications'), '/en/services must hide samples');
    assert.ok(enFaq.includes('No questions published yet.') && !enFaq.includes('How long does a project take?'), '/en/faq must hide samples');
    assert.ok(!enContact.includes('hello@paramistech.example') && !enContact.includes('Tehran, Iran'), '/en/contact must hide placeholder contact details');
    assert.equal((await get('/en/projects/smart-finance')).status, 404, 'English sample project page must be 404');
    assert.ok(!sitemap.includes('/en/projects/smart-finance') && !sitemap.includes('/en/services/mobile-apps'), 'sitemap must not list English samples');
    assert.ok(!(await (await get('/en')).text()).includes('id="services"'), 'English home omits empty sections');
    ok(`production mode, ALLOW_PLACEHOLDERS unset (fa and en): ${counts.projects} sample projects, ${counts.services} services, ${counts.faqs} FAQs are in the DB but invisible everywhere`);
  }
  const blog = await (await get('/blog')).text();
  assert.ok(
    blog.includes('مقاله‌ای منتشر نشده') || /<a [^>]*href="\/blog\/[a-z0-9-]+"[^>]*>/.test(blog),
    '/blog must show the empty state or a real published post',
  );

  // 5. Uploaded media is served with safe, immutable headers.
  // Write a real WebP to UPLOADS_DIR + a media row, then fetch it via /api/media/<id> to verify the headers.
  const { default: sharp } = await import('sharp');
  const fs = await import('node:fs/promises');
  const uploadsDir = process.env.UPLOADS_DIR || '/tmp/paramistech-uploads';
  await fs.mkdir(uploadsDir, { recursive: true });
  const webpPath = `prod-check-${Date.now()}.webp`;
  await sharp({ create: { width: 4, height: 4, channels: 3, background: '#FAFAF7' } })
    .webp({ quality: 80 })
    .toFile(`${uploadsDir}/${webpPath}`);
  const inserted = await pool.query(
    `insert into media (path, mime, size, width, height, alt_text) values ($1, 'image/webp', 64, 4, 4, 'prod check') returning id`,
    [webpPath],
  );
  const mediaId = inserted.rows[0].id;
  try {
    const response = await get(`/api/media/${mediaId}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control') ?? '', /immutable/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('content-type'), 'image/webp');
    await response.arrayBuffer();
    ok('uploaded media: image/webp, immutable cache, nosniff');
  } finally {
    await pool.query('delete from media where id = $1', [mediaId]);
    await fs.unlink(`${uploadsDir}/${webpPath}`).catch(() => undefined);
  }

  // 6. Login lockout: 5 wrong passwords for one email, then even the right one is refused.
  const email = process.env.LOCKOUT_EMAIL || 'e2e-admin@paramistech.test';
  const attempt = (password) => get('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ email, password }) });
  await pool.query('delete from admin_login_attempts');
  for (let i = 0; i < 5; i += 1) assert.equal((await attempt('wrong-password-attempt')).status, 401);
  assert.equal((await attempt('e2e-only-password-14')).status, 429, 'correct password must be refused while locked out');
  const generic = await (await attempt('wrong-password-attempt')).json();
  assert.ok(generic.error);
  await pool.query('delete from admin_login_attempts');
  ok('lockout: 5 failures -> 429 even with the correct password; uniform 401 body for wrong credentials');
} finally {
  await pool.end();
}
console.log(`PROD CHECKS PASSED (${results.length} groups)`);
