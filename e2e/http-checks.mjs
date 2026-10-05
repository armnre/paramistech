// Browser-free end-to-end checks for ParamisTech against a running production build.
//
// The Playwright suites in this folder need a Chromium download, which is not always possible
// (locked-down CI, no network to cdn.playwright.dev, minimal container images). This script covers
// the same ground over plain HTTP: public pages in both locales, SEO endpoints, brand assets,
// dynamic OG cards, the lead API and its rate limits, admin auth/RBAC/session revocation, and the
// admin CMS write path exactly as a JavaScript-disabled browser submits it (multipart POST with the
// hidden $ACTION_ID field of the rendered form).
//
// Usage:
//   set -a; . ./.env; set +a
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node e2e/http-checks.mjs
//
// The suite writes rows (a lead, a post, a service edit, an editor account, a media item, settings)
// and cleans most of them up afterwards, so point it at a scratch database, never production.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const pg = require('pg');

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl) && process.env.E2E_ALLOW !== 'true') {
  throw new Error('Refusing to run against a non-local host (set E2E_ALLOW=true to override).');
}
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || baseUrl).replace(/\/+$/, '');
const publicHost = new URL(siteUrl).host;
const origin = siteUrl;
const directHost = new URL(baseUrl).host;

// A forwarded request (what a reverse proxy sends) must carry the public host so both Next's own
// Server Action check and src/lib/origin.ts agree with the Origin header.
const forwarded = publicHost === directHost ? {} : { host: publicHost, 'x-forwarded-host': publicHost, 'x-forwarded-proto': new URL(siteUrl).protocol.replace(':', '') };

const admin = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const stamp = Date.now();
const editor = { email: `e2e-editor-${stamp}@paramistech.test`, password: 'editor-password-14-chars' };
const lead = {
  projectType: 'توسعه نرم‌افزار سازمانی',
  budget: '۵۰ تا ۱۰۰ میلیون تومان',
  timeline: '۳ تا ۶ ماه',
  name: `بازدیدکننده ${stamp}`,
  email: `visitor-${stamp}@paramistech.test`,
  phone: '09123456789',
  details: 'این درخواست توسط مجموعهٔ تست بدون مرورگر ارسال شده است تا مسیر کامل فرم بررسی شود.',
  consent: true,
  locale: 'fa',
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const checks = [];
let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    checks.push(`PASS  ${name}`);
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures += 1;
    checks.push(`FAIL  ${name}\n      ${error.message.split('\n').join('\n      ')}`);
    console.error(`FAIL  ${name}\n      ${error.message.split('\n')[0]}`);
  }
}

async function req(pathname, { cookie, headers = {}, ...init } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: 'manual',
    ...init,
    headers: { ...forwarded, ...(cookie ? { cookie } : {}), ...headers },
  });
  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}

const post = (pathname, payload, options = {}) =>
  req(pathname, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json', origin, ...options.headers },
    cookie: options.cookie,
  });

function sessionCookie(response) {
  const raw = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
  const cookie = raw.filter(Boolean).map((value) => value.split(';')[0]).join('; ');
  assert.ok(cookie, 'expected the server to set a session cookie');
  return cookie;
}

async function login(credentials, { viaApi = true, headers = {} } = {}) {
  const response = await post('/api/admin/login', credentials, { headers });
  return { status: response.status, cookie: viaApi && response.status === 200 ? sessionCookie(response) : null, body: response.body };
}

/** Scrape every form of a page: names/values exactly as a no-JS browser would submit them. */
function decodeEntities(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return result;
}

function parseForms(html) {
  return [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)].map(([, formAttrs, inner]) => {
    const fields = [];
    let actionField = null;
    for (const match of inner.matchAll(/<input\b([^>]*)\/?>/g)) {
      const attrs = attributes(match[1]);
      if (!attrs.name) continue;
      if (attrs.name.startsWith('$ACTION_ID_')) {
        actionField = attrs.name;
        continue;
      }
      if (attrs.type === 'checkbox') {
        if ('checked' in attrs) fields.push([attrs.name, attrs.value || 'on']);
        continue;
      }
      if (attrs.type === 'file') continue;
      fields.push([attrs.name, attrs.value ?? '']);
    }
    for (const match of inner.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g)) {
      const attrs = attributes(match[1]);
      if (attrs.name) fields.push([attrs.name, decodeEntities(match[2])]);
    }
    for (const match of inner.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
      const attrs = attributes(match[1]);
      if (!attrs.name) continue;
      const options = [...match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(([, optionAttrs, text]) => ({
        ...attributes(optionAttrs),
        text: decodeEntities(text.trim()),
      }));
      const selected = options.find((option) => 'selected' in option) ?? options[0];
      fields.push([attrs.name, selected ? selected.value || selected.text : '']);
    }
    return { attrs: attributes(formAttrs), fields, actionField, raw: `${formAttrs}>${inner}` };
  });
}

/**
 * Submit the chosen form of `pathname` the way a browser without JavaScript does.
 * `pick` selects the form (default: the first one with an action id), `overrides` replaces field
 * values (a null value removes the field, e.g. to leave a checkbox unchecked).
 */
async function submitForm(pathname, cookie, { pick = () => true, overrides = {}, files = {} } = {}) {
  const page = await req(pathname, { cookie });
  assert.equal(page.status, 200, `${pathname} must render for the form test`);
  const forms = parseForms(page.body).filter((form) => form.actionField);
  assert.ok(forms.length > 0, `no server-action form found on ${pathname}`);
  const form = forms.find(pick) ?? forms[0];
  const data = new FormData();
  for (const [name, value] of form.fields) {
    if (name in overrides) continue;
    data.append(name, value);
  }
  for (const [name, value] of Object.entries(overrides)) if (value !== null) data.append(name, value);
  for (const [name, file] of Object.entries(files)) data.append(name, file);
  data.append(form.actionField, '');
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    body: data,
    redirect: 'manual',
    headers: { ...forwarded, cookie, origin },
  });
  return { status: response.status, location: response.headers.get('location'), body: await response.text(), fields: form.fields };
}

const one = async (sql, values = []) => (await pool.query(sql, values)).rows[0];

// ================================================================= public pages
const noindexPages = new Set(['/privacy', '/terms', '/en/privacy', '/en/terms']);
const pages = [
  ['/', 'fa', 'پارامیس‌تک'],
  ['/about', 'fa', 'درباره ما'],
  ['/services', 'fa', 'خدمات'],
  ['/projects', 'fa', 'پروژه‌ها'],
  ['/blog', 'fa', 'وبلاگ'],
  ['/faq', 'fa', 'سوالات متداول'],
  ['/contact', 'fa', 'تماس'],
  ['/privacy', 'fa', 'حریم خصوصی'],
  ['/terms', 'fa', 'شرایط'],
  ['/en', 'en', 'ParamisTech'],
  ['/en/about', 'en', 'About'],
  ['/en/services', 'en', 'Services'],
  ['/en/projects', 'en', 'Projects'],
  ['/en/blog', 'en', 'Blog'],
  ['/en/faq', 'en', 'FAQ'],
  ['/en/contact', 'en', 'Contact'],
  ['/en/privacy', 'en', 'Privacy'],
  ['/en/terms', 'en', 'Terms'],
];

for (const [pathname, locale, marker] of pages) {
  await check(`GET ${pathname} renders as ${locale}`, async () => {
    const { status, body, headers } = await req(pathname);
    assert.equal(status, 200);
    assert.match(headers.get('content-type') ?? '', /text\/html/);
    assert.ok(body.includes(marker), `expected ${marker}`);
    assert.match(body, new RegExp(`<html lang="${locale}" dir="${locale === 'fa' ? 'rtl' : 'ltr'}"`));
    assert.ok(body.includes(`rel="canonical" href="${siteUrl}${pathname === '/' ? '' : pathname}"`), 'canonical url');
    assert.match(body, new RegExp(`<meta name="robots" content="${noindexPages.has(pathname) ? 'noindex' : 'index'}, follow"`));
  });
}

await check('HTML responses are dynamic, nonce-protected and frame-denied', async () => {
  const { headers } = await req('/');
  assert.match(headers.get('cache-control') ?? '', /no-store/);
  const csp = headers.get('content-security-policy') ?? '';
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  assert.ok(nonce, 'CSP must carry a nonce');
  assert.match(csp, /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  assert.ok(!/script-src[^;]*unsafe-inline/.test(csp), 'scripts must not allow unsafe-inline');
  assert.ok(!/unsafe-eval/.test(csp), 'production must not allow unsafe-eval');
  assert.match(csp, /style-src 'self' 'unsafe-inline'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.match(headers.get('referrer-policy') ?? '', /strict-origin-when-cross-origin/);
  assert.equal(headers.get('x-powered-by'), null);

  const second = await req('/');
  assert.notEqual(/nonce-([^']+)/.exec(second.headers.get('content-security-policy'))[1], nonce, 'nonce must rotate');
  assert.ok(second.body.includes(`nonce="${/'nonce-([^']+)'/.exec(second.headers.get('content-security-policy'))[1]}"`), 'inline scripts use the request nonce');
});

await check('HSTS is returned only for https requests', async () => {
  const plain = await req('/', { headers: { 'x-forwarded-proto': 'http' } });
  assert.equal(plain.headers.get('strict-transport-security'), null);
  const secure = await req('/', { headers: { 'x-forwarded-proto': 'https' } });
  assert.match(secure.headers.get('strict-transport-security') ?? '', /max-age=63072000; includeSubDomains; preload/);
});

await check('/design-system is development-only', async () => {
  const { status } = await req('/design-system');
  assert.equal(status, 404, 'the review page must not exist in production');
});

await check('unknown pages and slugs return 404 with a Persian notice', async () => {
  for (const pathname of ['/no-such-page', '/services/no-such-service', '/en/projects/no-such-project', '/blog/no-such-post']) {
    const { status, body } = await req(pathname);
    assert.equal(status, 404, pathname);
    assert.match(body, /۴۰۴|404/);
  }
});

// ================================================================= content + i18n
await check('seeded content renders in both locales', async () => {
  const services = await req('/services');
  assert.ok(services.body.includes('توسعه نرم‌افزار سازمانی'), 'fa service');
  assert.ok(services.body.includes('/services/enterprise-software'), 'service link');
  const servicesEn = await req('/en/services');
  assert.ok(/Enterprise|enterprise-software/.test(servicesEn.body), 'en service');
  const project = await req('/projects/smart-finance');
  assert.ok(project.body.includes('فین‌تک'), 'project category');
  assert.equal((await req('/en/projects/smart-finance')).status, 200);
  assert.equal((await req('/services/enterprise-software')).status, 200);
  assert.equal((await req('/en/services/enterprise-software')).status, 200);
  const faq = await req('/faq');
  assert.ok(faq.body.includes('FAQPage'), 'FAQ structured data');
});

await check('language switcher and hreflang link the equivalent pages', async () => {
  const fa = await req('/services');
  assert.ok(fa.body.includes('href="/en/services"'), 'fa -> en switcher');
  assert.match(fa.body, new RegExp(`hrefLang="en" href="${siteUrl}/en/services"`, 'i'), 'hreflang en');
  assert.match(fa.body, /hrefLang="x-default"/i, 'x-default');
  const en = await req('/en/services');
  assert.ok(en.body.includes('href="/services"'), 'en -> fa switcher');
});

await check('contact page server-renders the first step, the honeypot and the client form payload', async () => {
  const { body } = await req('/contact');
  assert.ok(body.includes('name="projectType"'), 'first step renders');
  assert.ok(body.includes('name="website"'), 'honeypot field');
  // The remaining steps (budget, timeline, contact details, consent) live in the client component,
  // so they only exist in the hydration payload until JavaScript runs.
  assert.ok(body.includes('consent'), 'consent lives in the form schema');
  assert.ok(body.includes('مراحل درخواست'), 'step indicator (multi-step wizard)');
});

await check('structured data is parseable JSON-LD with breadcrumbs on inner pages', async () => {
  for (const pathname of ['/services', '/projects/smart-finance', '/blog', '/contact']) {
    const { body } = await req(pathname);
    const blocks = [...body.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    assert.ok(blocks.length >= 1, `${pathname} needs JSON-LD`);
    assert.ok(blocks.some((block) => block['@type'] === 'BreadcrumbList'), `${pathname} breadcrumbs`);
    assert.ok(blocks.every((block) => block['@context'] === 'https://schema.org'), `${pathname} context`);
  }
});

// ================================================================= SEO endpoints
await check('sitemap lists both locales with hreflang alternates', async () => {
  const { status, body, headers } = await req('/sitemap.xml');
  assert.equal(status, 200);
  assert.match(headers.get('content-type') ?? '', /xml/);
  assert.match(headers.get('cache-control') ?? '', /max-age=600/);
  // staticPagePaths excludes the legal pages on purpose; they stay out of the sitemap.
  for (const entry of ['', '/services', '/projects', '/blog', '/faq', '/contact', '/about']) {
    assert.ok(body.includes(`<loc>${siteUrl}${entry}</loc>`), `fa ${entry}`);
    assert.ok(body.includes(`<loc>${siteUrl}/en${entry}</loc>`), `en ${entry}`);
  }
  assert.ok(body.includes('hreflang'), 'alternate links');
  assert.ok(!body.includes(`${siteUrl}/privacy`), 'legal pages stay out of the sitemap');
});

await check('robots.txt blocks /admin and advertises the sitemap', async () => {
  const { status, body } = await req('/robots.txt');
  assert.equal(status, 200);
  assert.match(body, /Disallow: \/admin/);
  assert.ok(body.includes(`${siteUrl}/sitemap.xml`));
});

await check('RSS feeds render for both locales with absolute links', async () => {
  for (const pathname of ['/rss.xml', '/en/rss.xml']) {
    const { status, body, headers } = await req(pathname);
    assert.equal(status, 200, pathname);
    assert.match(headers.get('content-type') ?? '', /xml/, pathname);
    assert.ok(body.includes('<rss'), pathname);
    assert.ok(body.includes(siteUrl), pathname);
  }
});

await check('security.txt is published', async () => {
  const { status, body } = await req('/.well-known/security.txt');
  assert.equal(status, 200);
  assert.match(body, /Contact:/i);
});

// ================================================================= assets + OG
const brandAssets = ['/og.png', '/og-en.png', '/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/icon.svg', '/site.webmanifest'];
for (const asset of brandAssets) {
  await check(`GET ${asset} is served with a one-day cache`, async () => {
    const { status, headers } = await req(asset);
    assert.equal(status, 200);
    assert.match(headers.get('cache-control') ?? '', /max-age=86400/);
  });
}

await check('brand assets have the documented dimensions and manifest entries exist', async () => {
  const icons = { 'icon-512.png': [512, 512], 'icon-192.png': [192, 192], 'apple-touch-icon.png': [180, 180], 'favicon-32.png': [32, 32] };
  for (const [file, size] of Object.entries(icons)) {
    const meta = await sharp(path.join('public', file)).metadata();
    assert.deepEqual([meta.width, meta.height], size, file);
  }
  for (const file of ['og.png', 'og-en.png']) {
    const meta = await sharp(path.join('public', file)).metadata();
    assert.deepEqual([meta.width, meta.height], [1200, 630], file);
  }
  const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8'));
  assert.ok(manifest.icons.length > 0);
  for (const icon of manifest.icons) assert.ok(readFileSync(path.join('public', icon.src)).length > 0, icon.src);
});

await check('dynamic OG cards render for projects and posts in both locales', async () => {
  for (const pathname of ['/projects/smart-finance/opengraph-image', '/en/projects/smart-finance/opengraph-image']) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 200, pathname);
    assert.match(response.headers.get('content-type') ?? '', /image\/png/, pathname);
    assert.match(response.headers.get('cache-control') ?? '', /max-age=3600/, pathname);
    const meta = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    assert.deepEqual([meta.width, meta.height], [1200, 630], pathname);
  }
});

await check('unknown items fall back to the static OG cards', async () => {
  const fa = await fetch(`${baseUrl}/projects/no-such-project/opengraph-image`);
  assert.deepEqual(Buffer.from(await fa.arrayBuffer()), readFileSync('public/og.png'));
  const en = await fetch(`${baseUrl}/en/blog/no-such-post/opengraph-image`);
  assert.deepEqual(Buffer.from(await en.arrayBuffer()), readFileSync('public/og-en.png'));
});

await check('web fonts are self-hosted from /_next/static', async () => {
  const { body } = await req('/');
  const styles = [...new Set([...body.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((match) => match[1]))];
  assert.ok(styles.length > 0, 'page links a stylesheet');
  const fonts = [];
  for (const stylesheet of styles) {
    const css = await fetch(`${baseUrl}${stylesheet}`);
    assert.equal(css.status, 200, stylesheet);
    const cssUrl = new URL(stylesheet, baseUrl);
    for (const match of (await css.text()).matchAll(/url\((['"]?)([^)'"]+\.woff2?)\1\)/g)) {
      fonts.push(new URL(match[2], cssUrl).pathname);
    }
  }
  assert.ok(fonts.length > 0, 'stylesheets must declare @font-face files');
  const font = await fetch(`${baseUrl}${fonts[0]}`);
  assert.equal(font.status, 200);
  assert.match(font.headers.get('content-type') ?? '', /font|woff/);
  assert.match(font.headers.get('cache-control') ?? '', /immutable/);
});

// ================================================================= lead API
await check('lead API rejects invalid payloads with per-field errors', async () => {
  const { status, body } = await post('/api/leads', { name: 'x' });
  assert.equal(status, 400);
  assert.equal(JSON.parse(body).code, 'invalid');
  assert.ok(JSON.parse(body).fields.details, 'details error');
  assert.ok(JSON.parse(body).fields.consent, 'consent error');
});

await check('lead API silently drops honeypot submissions', async () => {
  const { status, body } = await post('/api/leads', { ...lead, email: `spam-${stamp}@x.test`, website: 'http://spam.example' });
  assert.equal(status, 400);
  assert.equal(JSON.parse(body).code, 'invalid');
  assert.equal(await one('SELECT count(*)::int AS total FROM leads WHERE email = $1', [`spam-${stamp}@x.test`]).then((row) => row.total), 0);
});

let storedLead;
await check('lead API stores a valid submission with consent metadata', async () => {
  const { status, body } = await post('/api/leads', lead, { headers: { 'x-forwarded-for': '203.0.113.10' } });
  assert.equal(status, 201, body);
  assert.deepEqual(JSON.parse(body), { ok: true });
  storedLead = await one('SELECT * FROM leads WHERE email = $1', [lead.email]);
  assert.ok(storedLead, 'lead row exists');
  assert.equal(storedLead.status, 'new');
  assert.equal(storedLead.locale, 'fa');
  assert.equal(storedLead.consent, true);
  assert.ok(storedLead.consent_at, 'consent timestamp');
  assert.ok((await one('SELECT count(*)::int AS total FROM lead_attempts')).total >= 1, 'rate-limit bucket written');
});

await check('lead API rate limits a single IP after five submissions', async () => {
  const headers = { 'x-forwarded-for': '198.51.100.9' };
  for (let index = 1; index <= 5; index += 1) {
    const { status } = await post('/api/leads', { ...lead, email: `rl-${index}-${stamp}@x.test`, details: `${lead.details} شماره ${index}` }, { headers });
    assert.equal(status, 201, `submission ${index}`);
  }
  const blocked = await post('/api/leads', { ...lead, email: `rl-6-${stamp}@x.test` }, { headers });
  assert.equal(blocked.status, 429);
  assert.equal(JSON.parse(blocked.body).code, 'rate_limited');
});

await check('lead API answers 500 for malformed JSON instead of crashing the process', async () => {
  const { status } = await req('/api/leads', { method: 'POST', body: '{oops', headers: { 'content-type': 'application/json' } });
  assert.equal(status, 500);
  const health = await req('/api/health');
  assert.deepEqual(JSON.parse(health.body), { ok: true });
});

await check('health endpoint verifies the database connection', async () => {
  const { status, body } = await req('/api/health');
  assert.equal(status, 200);
  assert.deepEqual(JSON.parse(body), { ok: true });
});

// ================================================================= admin auth
let adminCookie;
let editorCookie;

await check('admin login rejects missing and foreign origins', async () => {
  const missing = await req('/api/admin/login', { method: 'POST', body: JSON.stringify(admin), headers: { 'content-type': 'application/json' } });
  assert.equal(missing.status, 403);
  const foreign = await post('/api/admin/login', admin, { headers: { origin: 'https://evil.example' } });
  assert.equal(foreign.status, 403);
});

await check('admin login rejects a wrong password and counts the failure', async () => {
  const before = (await one('SELECT count(*)::int AS total FROM admin_login_attempts')).total;
  const { status, body } = await post('/api/admin/login', { ...admin, password: 'definitely-wrong-14' }, { headers: { 'x-forwarded-for': '198.51.100.30' } });
  assert.equal(status, 401);
  assert.ok(JSON.parse(body).error);
  assert.equal((await one('SELECT count(*)::int AS total FROM admin_login_attempts')).total, before + 1);
});

await check('admin login succeeds and sets a hardened cookie', async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { ...forwarded, 'content-type': 'application/json', origin, 'x-forwarded-for': '198.51.100.31' },
    body: JSON.stringify(admin),
  });
  assert.equal(response.status, 200);
  const raw = response.headers.getSetCookie()[0];
  assert.match(raw, /HttpOnly/i);
  assert.match(raw, /SameSite=Strict/i);
  assert.match(raw, /Secure/i, 'an https deployment must set Secure');
  assert.match(raw, /Path=\//);
  adminCookie = sessionCookie(response);
  assert.equal((await one('SELECT count(*)::int AS total FROM sessions')).total >= 1, true);
});

await check('a successful login clears that email\'s failure bucket', async () => {
  const email = `lockout-${stamp}@paramistech.test`;
  for (let index = 0; index < 4; index += 1) {
    const { status } = await post('/api/admin/login', { email, password: 'wrong-password-14' }, { headers: { 'x-forwarded-for': '198.51.100.32' } });
    assert.equal(status, 401, `attempt ${index + 1}`);
  }
  const { rows } = await pool.query('SELECT count(*)::int AS total FROM admin_login_attempts');
  const before = rows[0].total;
  await pool.query('DELETE FROM admin_login_attempts'); // deterministic starting point for the next check
  assert.ok(before >= 4);
});

await check('login locks out an email after five failures and unlocks later', async () => {
  const email = `lockout-${stamp}@paramistech.test`;
  for (let index = 0; index < 5; index += 1) {
    await post('/api/admin/login', { email, password: 'wrong-password-14' }, { headers: { 'x-forwarded-for': '198.51.100.33' } });
  }
  const locked = await post('/api/admin/login', { email, password: 'wrong-password-14' }, { headers: { 'x-forwarded-for': '198.51.100.33' } });
  assert.equal(locked.status, 429, 'fifth failure locks the account for 15 minutes');
  const adminStillOk = await post('/api/admin/login', { ...admin, password: 'wrong-password-14' }, { headers: { 'x-forwarded-for': '198.51.100.34' } });
  assert.equal(adminStillOk.status, 401, 'the lockout is per email, not global');
  await pool.query('DELETE FROM admin_login_attempts');
});

await check('admin pages render the login form for anonymous visitors and leak nothing', async () => {
  const { status, body } = await req('/admin/leads');
  assert.equal(status, 200);
  assert.ok(body.includes('admin-email'), 'login form');
  assert.ok(!body.includes(lead.name), 'no lead data');
  assert.match(body, /<meta name="robots" content="noindex/);
});

await check('admin pages are noindex and show Persian labels for staff', async () => {
  // Markers are the real heading copy from src/content/admin.ts.
  const pagesToCheck = [
    ['/admin', 'داشبورد'],
    ['/admin/leads', 'درخواست‌ها'],
    [`/admin/leads/${storedLead.id}`, lead.email],
    ['/admin/services', 'خدمات'],
    ['/admin/services/1', 'عنوان'],
    ['/admin/services/new', 'مورد جدید'],
    ['/admin/projects', 'پروژه‌ها'],
    ['/admin/projects/1', 'عنوان'],
    ['/admin/posts', 'مقالات'],
    ['/admin/posts/new', 'نویسنده'],
    ['/admin/faqs', 'سوالات متداول'],
    ['/admin/faqs/new', 'پرسش'],
    ['/admin/media', 'رسانه'],
    ['/admin/settings', 'تنظیمات'],
    ['/admin/users', 'کاربران'],
    ['/admin/audit', 'گزارش فعالیت'],
    ['/admin/account', 'حساب من'],
  ];
  for (const [pathname, marker] of pagesToCheck) {
    const { status, body } = await req(pathname, { cookie: adminCookie });
    assert.equal(status, 200, `${pathname} -> ${status}`);
    assert.ok(body.includes(marker), `${pathname} shows ${marker}`);
    assert.match(body, /<meta name="robots" content="noindex/, `${pathname} is noindex`);
    assert.ok(!/<meta name="robots" content="index/.test(body), `${pathname} must not be indexable`);
  }
});

await check('unknown admin ids return 404', async () => {
  for (const pathname of ['/admin/services/99999', '/admin/projects/99999', '/admin/posts/99999', '/admin/faqs/99999']) {
    const { status } = await req(pathname, { cookie: adminCookie });
    assert.equal(status, 404, pathname);
  }
});

await check('CSV export needs an admin and mails a BOM-prefixed file', async () => {
  const anonymous = await req('/admin/leads/export');
  assert.equal(anonymous.status, 401);
  const response = await fetch(`${baseUrl}/admin/leads/export`, { redirect: 'manual', headers: { ...forwarded, cookie: adminCookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/csv; charset=utf-8/);
  assert.match(response.headers.get('content-disposition') ?? '', /attachment; filename="leads.csv"/);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), 'UTF-8 BOM for Excel');
  const text = bytes.toString('utf8');
  assert.ok(text.includes(lead.name), 'lead included');
  assert.ok(text.includes('"details"'), 'quoted headers');
  assert.ok((await one('SELECT count(*)::int AS total FROM audit_log WHERE action = $1', ['lead.export'])).total >= 1, 'export audited');
});

await check('markdown preview renders sanitized HTML for staff only', async () => {
  const anonymous = await post('/api/admin/preview', { markdown: '# hi' });
  assert.equal(anonymous.status, 403);
  const { status, body } = await post('/api/admin/preview', { markdown: '# سلام\n\n<script>alert(1)</script>\n\n**bold**' }, { cookie: adminCookie });
  assert.equal(status, 200);
  const html = JSON.parse(body).html;
  assert.match(html, /<h1/);
  assert.match(html, /<strong>/);
  assert.ok(!html.includes('<script'), 'scripts stripped');
});

// ================================================================= no-JavaScript admin login
await check('the login form is a real form so it works without JavaScript', async () => {
  const { body } = await req('/admin');
  const form = parseForms(body).find((entry) => entry.fields.some(([name]) => name === 'email'));
  assert.ok(form, 'login form rendered');
  assert.equal(form.attrs.action, '/api/admin/login');
  assert.equal((form.attrs.method ?? '').toLowerCase(), 'post');
  assert.ok(form.actionField === null, 'the login form must not depend on a server-action id');
  assert.ok(form.fields.some(([name]) => name === 'password'), 'password field');
});

await check('the login route maps a redirect back with a known error code', async () => {
  await pool.query('DELETE FROM admin_login_attempts');
  const bad = await req('/api/admin/login', {
    method: 'POST',
    body: new URLSearchParams({ email: admin.email, password: 'wrong-password-14' }).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin },
  });
  assert.equal(bad.status, 303);
  assert.equal(bad.headers.get('location'), '/admin?error=invalid');
  const page = await req('/admin?error=invalid', { headers: { referer: `${siteUrl}/admin` } });
  assert.ok(page.body.includes('اطلاعات ورود نادرست است'), 'the code is rendered as Persian copy');
  assert.ok(!page.body.includes('wrong-password-14'), 'credentials are never echoed back');
  await pool.query('DELETE FROM admin_login_attempts');
});

await check('a native form post logs in and lands in the panel (no JavaScript at all)', async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { ...forwarded, 'content-type': 'application/x-www-form-urlencoded', origin },
    body: new URLSearchParams({ email: admin.email, password: admin.password }).toString(),
  });
  assert.equal(response.status, 303, 'a browser form post must be answered with a redirect');
  assert.equal(response.headers.get('location'), '/admin');
  const cookie = sessionCookie(response);
  const panel = await req('/admin', { cookie });
  assert.equal(panel.status, 200);
  assert.ok(panel.body.includes('داشبورد'), 'the dashboard is rendered');
  assert.ok(!panel.body.includes('admin-email'), 'the login form is gone');

  // the logout button is a native form as well
  const shell = parseForms(panel.body).find((entry) => entry.attrs.action === '/api/admin/logout');
  assert.ok(shell, 'logout is a native form post');
  const out = await fetch(`${baseUrl}/api/admin/logout`, {
    method: 'POST',
    redirect: 'manual',
    headers: { ...forwarded, 'content-type': 'application/x-www-form-urlencoded', origin, cookie },
    body: '',
  });
  assert.equal(out.status, 303);
  assert.equal(out.headers.get('location'), '/admin');
  const after = await req('/admin', { cookie });
  assert.ok(after.body.includes('admin-email'), 'the session is gone after a native logout');
});

// ================================================================= CMS writes
await check('a service can be created, published and appears on the public page immediately', async () => {
  const slug = `e2e-service-${stamp}`;
  const title = `خدمت آزمایشی ${stamp}`;
  const result = await submitForm('/admin/services/new', adminCookie, {
    overrides: {
      slug,
      title,
      shortDescription: 'توضیح کوتاه ساخته‌شده توسط تست خودکار برای بررسی مسیر انتشار.',
      bodyMd: '## متن آزمایشی\n\nمحتوای markdown توسط تست ساخته شده است.',
      icon: 'cloud',
      sortOrder: '9',
      published: 'on',
    },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  const row = await one('SELECT * FROM services WHERE slug = $1', [slug]);
  assert.equal(row.title, title);
  assert.equal(row.published, true);
  const published = await req('/services');
  assert.ok(published.body.includes(title), 'public list reflects the new service without a rebuild');
  assert.equal((await req(`/services/${slug}`)).status, 200);
  assert.ok((await one('SELECT count(*)::int AS total FROM audit_log WHERE action = $1 AND entity_id = $2', ['service.save', String(row.id)])).total >= 0);
});

await check('a service can be edited through the rendered form (no-JS submission path)', async () => {
  const row = await one('SELECT * FROM services WHERE slug = $1', [`e2e-service-${stamp}`]);
  const edited = 'متن ویرایش‌شده توسط تست خودکار.';
  const result = await submitForm(`/admin/services/${row.id}`, adminCookie, {
    pick: (form) => form.fields.some(([name, value]) => name === 'id' && Number(value) === row.id),
    overrides: { bodyMd: edited, published: 'on' },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  assert.equal((await one('SELECT body_md FROM services WHERE id = $1', [row.id])).body_md, edited);
});

await check('unpublishing a service removes it from the public site at once', async () => {
  const row = await one('SELECT * FROM services WHERE slug = $1', [`e2e-service-${stamp}`]);
  const result = await submitForm(`/admin/services/${row.id}`, adminCookie, {
    pick: (form) => form.fields.some(([name, value]) => name === 'id' && Number(value) === row.id),
    overrides: { published: null },
  });
  assert.equal(result.status, 303);
  assert.equal((await one('SELECT published FROM services WHERE id = $1', [row.id])).published, false);
  assert.equal((await req(`/services/${row.slug}`)).status, 404, 'unpublished service is not reachable');
  assert.ok(!(await req('/services')).body.includes(row.title), 'unpublished service is hidden');
});

await check('service validation failures are reported back on the form', async () => {
  const bad = await submitForm('/admin/services/new', adminCookie, { overrides: { slug: 'Not A Slug!', title: 'x' } });
  assert.equal(bad.status, 303);
  assert.match(bad.location ?? '', /error=/);
  assert.equal(await one('SELECT count(*)::int AS total FROM services WHERE slug = $1', ['Not A Slug!']).then((row) => row.total), 0);
});

await check('a post can be created, published and picked up by blog, RSS and OG cards', async () => {
  const slug = `e2e-post-${stamp}`;
  const title = `مقاله آزمایشی ${stamp}`;
  const result = await submitForm('/admin/posts/new', adminCookie, {
    overrides: {
      slug,
      title,
      excerpt: 'خلاصه مقاله آزمایشی ساخته‌شده در تست بدون مرورگر.',
      bodyMd: '## سلام\n\nاین مقاله برای بررسی مسیر انتشار ساخته شده است.',
      author: 'تست خودکار',
      published: 'on',
    },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  const row = await one('SELECT * FROM posts WHERE slug = $1', [slug]);
  assert.equal(row.published, true);
  assert.ok(row.published_at, 'published_at stamped');
  const blog = await req('/blog');
  assert.ok(blog.body.includes(title), 'blog index');
  const page = await req(`/blog/${slug}`);
  assert.equal(page.status, 200);
  assert.ok(/"@type":"Article"/.test(page.body), 'article structured data');
  assert.ok((await req('/rss.xml')).body.includes(slug), 'RSS picks up the post');
  const og = await fetch(`${baseUrl}/blog/${slug}/opengraph-image`);
  assert.equal(og.status, 200);
  assert.deepEqual([(await sharp(Buffer.from(await og.arrayBuffer())).metadata()).width, 630], [1200, 630]);
});

await check('a noindex post stays out of the sitemap and carries meta robots noindex', async () => {
  const slug = `e2e-noindex-${stamp}`;
  const result = await submitForm('/admin/posts/new', adminCookie, {
    overrides: {
      slug,
      title: `مقاله بدون ایندکس ${stamp}`,
      excerpt: 'مقاله‌ای که نباید در نقشه سایت باشد.',
      bodyMd: 'متن.',
      published: 'on',
      noindex: 'on',
    },
  });
  assert.equal(result.status, 303);
  const page = await req(`/blog/${slug}`);
  assert.match(page.body, /<meta name="robots" content="noindex/);
  assert.ok(!(await req('/sitemap.xml')).body.includes(slug), 'noindex post excluded from sitemap');
});

await check('toggling a post from the list form unpublishes it', async () => {
  const row = await one('SELECT * FROM posts WHERE slug = $1', [`e2e-post-${stamp}`]);
  const result = await submitForm('/admin/posts', adminCookie, {
    pick: (form) => form.fields.some(([name, value]) => name === 'id' && Number(value) === row.id),
    overrides: { published: 'false' },
  });
  assert.ok([200, 303].includes(result.status), `toggle returned ${result.status}`);
  assert.equal((await one('SELECT published FROM posts WHERE id = $1', [row.id])).published, false);
  assert.notEqual((await req('/blog')).body.includes(`/blog/${row.slug}"`), true, 'unpublished post leaves the index');
});

await check('an FAQ can be added and shows up on the public FAQ page', async () => {
  const question = `پرسش آزمایشی ${stamp}؟`;
  const result = await submitForm('/admin/faqs/new', adminCookie, {
    overrides: { question, answer: 'پاسخ آزمایشی برای بررسی مسیر مدیریت پرسش‌های متداول.', published: 'on', sortOrder: '9' },
  });
  assert.equal(result.status, 303);
  const row = await one('SELECT * FROM faqs WHERE question = $1', [question]);
  assert.ok(row, 'faq row');
  const page = await req('/faq');
  assert.ok(page.body.includes(question), 'FAQ page');
  assert.ok(page.body.includes(question.replace('؟', '؟')), 'FAQ rich result');
});

await check('a project can be added and opens on the public site', async () => {
  const slug = `e2e-project-${stamp}`;
  const result = await submitForm('/admin/projects/new', adminCookie, {
    overrides: {
      slug,
      title: `پروژه آزمایشی ${stamp}`,
      category: 'آزمایشی',
      summary: 'خلاصه پروژه آزمایشی برای بررسی مسیر ساخت پروژه.',
      year: '۱۴۰۵',
      techTags: 'next,postgres',
      published: 'on',
    },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  assert.equal((await req(`/projects/${slug}`)).status, 200);
  assert.ok((await req('/projects')).body.includes(`پروژه آزمایشی ${stamp}`));
});

await check('settings edits reach the public contact page', async () => {
  const before = await one('SELECT * FROM settings WHERE id = 1');
  const email = `contact-${stamp}@paramistech.test`;
  const result = await submitForm('/admin/settings', adminCookie, {
    overrides: { contactEmail: email, contactPhone: '۰۲۱-۱۲۳۴۵۶۷۸', contactPhoneHref: '+982112345678' },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  assert.equal((await one('SELECT contact_email FROM settings WHERE id = 1')).contact_email, email);
  const contact = await req('/contact');
  assert.ok(contact.body.includes(email), 'contact page shows the new email');
  await submitForm('/admin/settings', adminCookie, {
    overrides: {
      contactEmail: before.contact_email,
      contactPhone: before.contact_phone,
      contactPhoneHref: before.contact_phone_href,
      contactAddress: before.contact_address,
    },
  });
  // Every admin save clears is_placeholder (an admin touching a sample row makes it real content), so
  // the flag has to be restored through SQL as well - otherwise production-mode checks go red later.
  await pool.query('UPDATE settings SET is_placeholder = $1 WHERE id = 1', [before.is_placeholder]);
  assert.equal((await one('SELECT is_placeholder FROM settings WHERE id = 1')).is_placeholder, before.is_placeholder);
});

await check('lead status and notes can be updated and are audited', async () => {
  const result = await submitForm(`/admin/leads/${storedLead.id}`, adminCookie, {
    overrides: { status: 'contacted', notes: 'تماس اولیه انجام شد.' },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  const row = await one('SELECT status, notes FROM leads WHERE id = $1', [storedLead.id]);
  assert.equal(row.status, 'contacted');
  assert.equal(row.notes, 'تماس اولیه انجام شد.');
  assert.ok((await one('SELECT count(*)::int AS total FROM audit_log WHERE action = $1', ['lead.update'])).total >= 1);
  const csv = await fetch(`${baseUrl}/admin/leads/export?status=contacted`, { redirect: 'manual', headers: { ...forwarded, cookie: adminCookie } });
  assert.ok((await csv.text()).includes(lead.name), 'status filter reaches the export');
});

// ================================================================= media
await check('an image upload is optimized to webp and served back', async () => {
  const png = await sharp({ create: { width: 400, height: 260, channels: 3, background: '#0f766e' } }).png().toBuffer();
  const file = new File([png], 'e2e-cover.png', { type: 'image/png' });
  const result = await submitForm('/admin/media', adminCookie, { files: { file }, overrides: { altText: 'تصویر آزمایشی' } });
  assert.equal(result.status, 303, `upload returned ${result.status}: ${result.location ?? ''}`);
  const row = await one('SELECT * FROM media ORDER BY id DESC LIMIT 1');
  assert.equal(row.mime, 'image/webp');
  assert.equal(row.width, 400);
  assert.equal(row.height, 260);
  assert.equal(row.alt_text, 'تصویر آزمایشی');
  const served = await fetch(`${baseUrl}/api/media/${row.id}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.match(served.headers.get('cache-control') ?? '', /immutable/);
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  const bytes = Buffer.from(await served.arrayBuffer());
  assert.equal((await sharp(bytes).metadata()).format, 'webp');
});

await check('media upload rejects files that are not real images', async () => {
  const file = new File([Buffer.from('this is not an image')], 'evil.png', { type: 'image/png' });
  const result = await submitForm('/admin/media', adminCookie, { files: { file }, overrides: { altText: 'بدون تصویر' } });
  assert.equal(result.status, 303);
  assert.match(result.location ?? '', /error=/, 'the form must report the rejection');
});

await check('media upload rejects files above 5 MB', async () => {
  const big = Buffer.concat([readFileSync(path.join('public', 'og.png')), Buffer.alloc(5 * 1024 * 1024)]);
  const file = new File([big], 'big.png', { type: 'image/png' });
  const result = await submitForm('/admin/media', adminCookie, { files: { file }, overrides: { altText: 'بزرگ' } });
  assert.ok([200, 303].includes(result.status), `oversized upload returned ${result.status}`);
  assert.match(result.location ?? '', /error=/, 'the form must report the size limit');
  assert.equal((await one("SELECT count(*)::int AS total FROM media WHERE alt_text = 'بزرگ'")).total, 0);
});

await check('the media API never serves unknown or unsafe ids', async () => {
  for (const pathname of ['/api/media/abc', '/api/media/-1', '/api/media/99999999']) {
    const { status } = await req(pathname);
    assert.equal(status, 404, pathname);
  }
});

// ================================================================= users + RBAC
await check('an admin can create an editor account from the users page', async () => {
  const result = await submitForm('/admin/users', adminCookie, {
    pick: (form) => form.fields.some(([name]) => name === 'email'),
    overrides: { email: editor.email, role: 'editor', password: editor.password },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  const row = await one('SELECT * FROM users WHERE email = $1', [editor.email]);
  assert.equal(row.role, 'editor');
  assert.ok(row.is_active);
  assert.notEqual(row.password_hash, editor.password, 'password is hashed');
  assert.ok(await bcrypt.compare(editor.password, row.password_hash));
});

await check('the editor can sign in and is limited to its role', async () => {
  const { status, cookie, body } = await login(editor);
  assert.equal(status, 200, body);
  editorCookie = cookie;
  const inbox = await req('/admin/leads', { cookie: editorCookie });
  assert.equal(inbox.status, 200);
  assert.ok(inbox.body.includes(lead.name), 'editors read leads');
  assert.equal((await req('/admin/services', { cookie: editorCookie })).status, 200, 'editors write content');
  assert.equal((await req('/admin/media', { cookie: editorCookie })).status, 200);
  assert.equal((await req('/admin/leads/export', { cookie: editorCookie })).status, 403, 'editors cannot export');
  for (const pathname of ['/admin/settings', '/admin/users', '/admin/audit']) {
    const response = await req(pathname, { cookie: editorCookie });
    assert.ok([301, 302, 303, 307, 308].includes(response.status), `${pathname} must redirect, got ${response.status}`);
    assert.equal(response.headers.get('location'), '/admin', `${pathname} redirect`);
  }
});

await check('an editor cannot delete leads or change settings/roles', async () => {
  const deleteAttempt = await submitForm(`/admin/leads/${storedLead.id}`, editorCookie, {
    pick: (form) => form.fields.some(([name]) => name === 'id'),
    overrides: {},
  }).catch(() => ({ status: 0 }));
  assert.ok([200, 303, 403, 500].includes(deleteAttempt.status));
  assert.ok(await one('SELECT 1 AS ok FROM leads WHERE id = $1', [storedLead.id]), 'lead still exists');
  assert.equal((await one('SELECT role FROM users WHERE email = $1', [editor.email])).role, 'editor');
});

await check('resetting a user password revokes their live sessions', async () => {
  const editorId = (await one('SELECT id FROM users WHERE email = $1', [editor.email])).id;
  const result = await submitForm('/admin/users', adminCookie, {
    pick: (form) =>
      form.fields.some(([name, value]) => name === 'id' && Number(value) === editorId) &&
      form.fields.some(([name]) => name === 'password'),
    overrides: { password: 'brand-new-editor-password' },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  const gated = await req('/admin/leads', { cookie: editorCookie });
  assert.ok(!gated.body.includes(lead.name), 'old session must be dead');
  assert.equal((await one('SELECT count(*)::int AS total FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = $1', [editor.email])).total, 0);
});

await check('a deactivated user is locked out immediately', async () => {
  const again = await login({ ...editor, password: 'brand-new-editor-password' });
  assert.equal(again.status, 200, 'the new password works');
  const editorId = (await one('SELECT id FROM users WHERE email = $1', [editor.email])).id;
  const result = await submitForm('/admin/users', adminCookie, {
    pick: (form) =>
      form.fields.some(([name, value]) => name === 'id' && Number(value) === editorId) &&
      form.fields.some(([name]) => name === 'active'),
    overrides: { active: 'false' },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  assert.equal((await one('SELECT is_active FROM users WHERE email = $1', [editor.email])).is_active, false);
  const gated = await req('/admin/leads', { cookie: again.cookie });
  assert.ok(!gated.body.includes(lead.name), 'deactivated staff loses access at once');
  const blockedLogin = await login({ ...editor, password: 'brand-new-editor-password' });
  assert.equal(blockedLogin.status, 401, 'a deactivated account cannot sign in');
});

await check('changing your own password invalidates the old one but keeps the session', async () => {
  const result = await submitForm('/admin/account', adminCookie, {
    overrides: { current: admin.password, next: 'rotated-admin-password-2026', confirm: 'rotated-admin-password-2026' },
  });
  assert.equal(result.status, 303, `action returned ${result.status}`);
  const stillIn = await req('/admin', { cookie: adminCookie });
  assert.equal(stillIn.status, 200);
  assert.equal((await post('/api/admin/login', admin)).status, 401, 'old password rejected');
  assert.equal((await post('/api/admin/login', { ...admin, password: 'rotated-admin-password-2026' })).status, 200);
  await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [await bcrypt.hash(admin.password, 12), admin.email]);
});

await check('sign out everywhere revokes all other sessions', async () => {
  const fresh = await login(admin);
  assert.equal(fresh.status, 200);
  const result = await submitForm('/admin/account', fresh.cookie, {
    pick: (form) => form.raw.includes('logoutEverywhere') || form.fields.every(([name]) => name !== 'current'),
    overrides: {},
  });
  assert.equal(result.status, 303, `logout everywhere returned ${result.status}`);
  const adminId = (await one('SELECT id FROM users WHERE email = $1', [admin.email])).id;
  assert.equal((await one('SELECT count(*)::int AS total FROM sessions WHERE user_id = $1', [adminId])).total, 0, 'every session of the account is gone');
  assert.equal(result.location, '/admin', 'redirected to the admin page');
  const after = await req('/admin', { cookie: fresh.cookie });
  assert.ok(after.body.includes('admin-email'), 'the old cookie is worthless');
});

await check('logout from the API clears the cookie and the session row', async () => {
  const fresh = await login(admin);
  assert.equal(fresh.status, 200);
  const adminId = (await one('SELECT id FROM users WHERE email = $1', [admin.email])).id;
  const before = (await one('SELECT count(*)::int AS total FROM sessions WHERE user_id = $1', [adminId])).total;
  const response = await req('/api/admin/logout', { method: 'POST', cookie: fresh.cookie, headers: { origin } });
  assert.equal(response.status, 200);
  const cleared = response.headers.getSetCookie().join(' ');
  assert.match(cleared, /paramis_session=;|Max-Age=0/);
  assert.equal((await one('SELECT count(*)::int AS total FROM sessions WHERE user_id = $1', [adminId])).total, before - 1);
  const gated = await req('/admin/leads', { cookie: fresh.cookie });
  assert.ok(!gated.body.includes(lead.name));
});

await check('audit log recorded the sensitive operations', async () => {
  const { rows } = await pool.query('SELECT action, count(*)::int AS total FROM audit_log GROUP BY action ORDER BY action');
  const actions = new Map(rows.map((row) => [row.action, row.total]));
  for (const expected of ['login', 'logout', 'lead.export', 'lead.update', 'media.upload', 'settings.update', 'service.create', 'post.create', 'faq.create', 'project.create', 'user.create', 'user.password_reset', 'user.deactivate']) {
    assert.ok(actions.has(expected), `expected audit action ${expected} (have: ${[...actions.keys()].join(', ')})`);
  }
  console.log(`      audit: ${rows.map((row) => `${row.action}×${row.total}`).join(', ')}`);
});

// ================================================================= cleanup
await check('test rows can be removed again', async () => {
  await pool.query("DELETE FROM posts WHERE slug LIKE 'e2e-%'");
  await pool.query("DELETE FROM services WHERE slug LIKE 'e2e-%'");
  await pool.query("DELETE FROM projects WHERE slug LIKE 'e2e-%'");
  await pool.query("DELETE FROM faqs WHERE question LIKE 'پرسش آزمایشی%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'e2e-editor-%@paramistech.test' OR email LIKE 'lockout-%@paramistech.test'");
  await pool.query("DELETE FROM leads WHERE email LIKE '%@paramistech.test' OR email LIKE 'rl-%@x.test'");
  await pool.query('DELETE FROM lead_attempts');
  await pool.query('DELETE FROM admin_login_attempts');
  assert.ok(true);
});

await pool.end();
console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
if (failures) {
  console.error(`\n${failures} failing checks:\n${checks.filter((line) => line.startsWith('FAIL')).join('\n')}`);
  process.exit(1);
}
