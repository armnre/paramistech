// Locale smoke test for a production build: fa (root, RTL) and en (/en, LTR) on key pages, the language
// switcher, English visibility rules, hreflang, sitemap, RSS, OG and an English lead through the real form.
// Run with sample content visible:  scripts/e2e.sh e2e/smoke-locales.mjs ALLOW_PLACEHOLDERS=true
import assert from 'node:assert/strict';
import pg from 'pg';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const stamp = Date.now();
const onlyFaSlug = `only-fa-${stamp}`;
const bothSlug = `both-${stamp}`;
const persian = /[\u0600-\u06FF]/;
const persianDigits = /[۰-۹]/;
const results = [];
const ok = (message) => { results.push(message); console.log(`ok  ${message}`); };

const get = async (path) => {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  return { response, text: await response.text() };
};
const attr = (html, tag, name) => html.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`))?.[1];
const visibleText = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
const switcher = (html) => html.match(/<a[^>]*class="lang-switch lang-switch-header"[^>]*>/)?.[0] ?? '';
const href = (tag) => tag.match(/href="([^"]*)"/)?.[1];

await pool.query(
  `INSERT INTO posts (slug, title, excerpt, body_md, published, published_at, is_placeholder)
   VALUES ($1, 'فقط فارسی', 'خلاصه', 'متن فارسی', true, now(), false)`,
  [onlyFaSlug],
);
await pool.query(
  `INSERT INTO posts (slug, title, excerpt, body_md, title_en, excerpt_en, body_md_en, published, published_at, is_placeholder)
   VALUES ($1, 'هر دو زبان', 'خلاصه', 'متن فارسی', 'Both languages', 'English excerpt', '## Heading\n\nEnglish body.', true, now(), false)`,
  [bothSlug],
);

try {
  // 1. Key pages in both locales: status, lang/dir, canonical, hreflang, switcher target.
  const pages = [
    ['home', '/', '/en'],
    ['services', '/services', '/en/services'],
    ['service', '/services/mobile-apps', '/en/services/mobile-apps'],
    ['projects', '/projects', '/en/projects'],
    ['project', '/projects/smart-finance', '/en/projects/smart-finance'],
    ['blog', '/blog', '/en/blog'],
    ['post', `/blog/${bothSlug}`, `/en/blog/${bothSlug}`],
    ['contact', '/contact', '/en/contact'],
    ['faq', '/faq', '/en/faq'],
    ['about', '/about', '/en/about'],
  ];
  for (const [name, faPath, enPath] of pages) {
    const fa = await get(faPath);
    const en = await get(enPath);
    assert.equal(fa.response.status, 200, `${faPath} -> ${fa.response.status}`);
    assert.equal(en.response.status, 200, `${enPath} -> ${en.response.status}`);
    assert.equal(attr(fa.text, 'html', 'lang'), 'fa', `${faPath}: lang`);
    assert.equal(attr(fa.text, 'html', 'dir'), 'rtl', `${faPath}: dir`);
    assert.equal(attr(en.text, 'html', 'lang'), 'en', `${enPath}: lang`);
    assert.equal(attr(en.text, 'html', 'dir'), 'ltr', `${enPath}: dir`);

    // hreflang: fa, en and x-default on both versions; canonical points at itself.
    for (const [html, self] of [[fa.text, faPath], [en.text, enPath]]) {
      const links = [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/gi)].map((m) => [m[1], new URL(m[2]).pathname]);
      const map = Object.fromEntries(links);
      assert.equal(map.fa, faPath, `${self}: hreflang fa`);
      assert.equal(map.en, enPath, `${self}: hreflang en`);
      assert.equal(map['x-default'], faPath, `${self}: hreflang x-default`);
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      assert.equal(new URL(canonical).pathname, self, `${self}: canonical`);
    }

    // Language switcher points at the equivalent page.
    assert.equal(href(switcher(fa.text)), enPath, `${faPath}: switcher`);
    assert.equal(href(switcher(en.text)), faPath, `${enPath}: switcher`);
    assert.match(switcher(en.text), /hrefLang="fa"/i);
    assert.match(switcher(fa.text), /hrefLang="en"/i);
    assert.ok(en.text.includes('class="skip-link"'), `${enPath}: skip link`);

    // English pages contain no Persian copy (except the switcher itself) and Latin digits only; fa uses Persian digits.
    const enVisible = visibleText(en.text.replace(/<a[^>]*class="lang-switch[\s\S]*?<\/a>/g, ' '));
    assert.ok(!persian.test(enVisible), `${enPath}: Persian text leaked into English page: ${enVisible.match(/.{0,30}[\u0600-\u06FF]+.{0,30}/)?.[0]}`);
    assert.ok(!persianDigits.test(enVisible), `${enPath}: Persian digits on an English page`);
    assert.ok(!persianDigits.test(attr(en.text, 'meta', 'content') ?? ''), 'no Persian digits in meta');
    assert.ok(persian.test(visibleText(fa.text)), `${faPath}: should be Persian`);
  }
  const faHome = visibleText((await get('/')).text);
  assert.ok(persianDigits.test(faHome), 'Persian pages use Persian digits');
  ok(`${pages.length} pages x 2 locales: lang/dir, canonical, hreflang fa/en/x-default, switcher target, no Persian leak, digits`);

  // 2. English visibility: no English text => no English page, list entry, sitemap entry or RSS item.
  const onlyFa = await get(`/en/blog/${onlyFaSlug}`);
  assert.equal(onlyFa.response.status, 404, 'a post without English must 404 under /en');
  assert.equal((await get(`/blog/${onlyFaSlug}`)).response.status, 200, 'but stay public in Persian');
  // NOTE: for a missing item the server's initial HTML is Next's bare shell (vercel/next.js#99287, see README
  // "Known issues"); the localized page is completed in the browser and asserted in the browser section below.
  const unmatched = await get('/en/no-such-page');
  assert.equal(unmatched.response.status, 404);
  assert.equal(attr(unmatched.text, 'html', 'lang'), 'en', 'unmatched English URL is fully server-rendered with lang=en');
  assert.equal(attr(unmatched.text, 'html', 'dir'), 'ltr');
  assert.ok(unmatched.text.includes('Page not found') && unmatched.text.includes('site-header'));
  assert.equal(attr((await get('/no-such-page')).text, 'html', 'dir'), 'rtl', 'unmatched Persian URL renders RTL on the server');
  assert.ok(!(await get('/en/blog')).text.includes(onlyFaSlug), 'omitted from the English list');
  assert.ok((await get('/blog')).text.includes(onlyFaSlug), 'present in the Persian list');
  const faOnlyPage = await get(`/blog/${onlyFaSlug}`);
  assert.equal(href(switcher(faOnlyPage.text)), '/en', 'no translation: the switcher falls back to the English home');
  assert.ok(!faOnlyPage.text.includes('hrefLang="en"') || !/<link rel="alternate" hrefLang="en"/i.test(faOnlyPage.text), 'no hreflang=en for an untranslated page');
  ok('untranslated post: /en 404 (localized, LTR), omitted from en list, switcher falls back to /en, no hreflang=en');

  const sitemap = (await get('/sitemap.xml')).text;
  assert.ok(sitemap.includes(`/en/blog/${bothSlug}`), 'sitemap lists the English post');
  assert.ok(!sitemap.includes(`/en/blog/${onlyFaSlug}`), 'sitemap omits the untranslated English URL');
  assert.ok(sitemap.includes(`/blog/${onlyFaSlug}`), 'sitemap keeps the Persian URL');
  assert.ok(/<xhtml:link[^>]*hreflang="en"[^>]*\/en\/blog\//.test(sitemap), 'sitemap carries hreflang alternates');
  assert.ok(/hreflang="x-default"/.test(sitemap));
  ok('sitemap: English entries only where English exists, with hreflang alternates');

  const rssEn = await get('/en/rss.xml');
  assert.match(rssEn.response.headers.get('content-type') ?? '', /rss\+xml/);
  assert.ok(rssEn.text.includes('<language>en</language>'));
  assert.ok(rssEn.text.includes(`/en/blog/${bothSlug}`) && !rssEn.text.includes(onlyFaSlug));
  const rssFa = await get('/rss.xml');
  assert.ok(rssFa.text.includes('<language>fa</language>') && rssFa.text.includes(onlyFaSlug));
  ok('RSS: /en/rss.xml (English items only) and /rss.xml (Persian)');

  // 3. Localized OG images and JSON-LD language.
  const ogEn = await fetch(`${baseUrl}/en/projects/smart-finance/opengraph-image`);
  assert.equal(ogEn.status, 200);
  assert.match(ogEn.headers.get('content-type') ?? '', /image\/png/);
  const missing = await fetch(`${baseUrl}/en/projects/nope/opengraph-image`);
  const fallbackBytes = Buffer.from(await missing.arrayBuffer());
  const { readFileSync } = await import('node:fs');
  assert.ok(fallbackBytes.equals(readFileSync('public/og-en.png')), 'unknown English item falls back to /og-en.png');
  const enPost = (await get(`/en/blog/${bothSlug}`)).text;
  assert.ok(enPost.includes('"inLanguage":"en-US"'), 'Article JSON-LD declares en-US');
  assert.ok((await get(`/blog/${bothSlug}`)).text.includes('"inLanguage":"fa-IR"'), 'Article JSON-LD declares fa-IR');
  assert.ok(enPost.includes('"@type":"BreadcrumbList"'));
  ok('OG: English card + /og-en.png fallback; JSON-LD inLanguage en-US / fa-IR');

  // 4. Browser: switcher click, dir/lang, keyboard reachability, English lead through the real form.
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  const consoleErrors = [];
  // Chrome logs "Failed to load resource: 404" for a 404 document; those URLs are intentional here.
  const expected404 = new Set([`/en/blog/${onlyFaSlug}`, '/blog/does-not-exist', '/en/projects/does-not-exist']);
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = new URL(message.location().url || baseUrl);
    if (expected404.has(location.pathname)) return;
    consoleErrors.push(`${message.text()} (${location.pathname})`);
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/en/services');
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
  await page.locator('a.lang-switch-header').click();
  await page.waitForURL((url) => url.pathname === '/services');
  assert.equal(await page.locator('html').getAttribute('lang'), 'fa');
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  await page.locator('a.lang-switch-footer').click();
  await page.waitForURL((url) => url.pathname === '/en/services');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  ok('switcher (header and footer) toggles fa <-> en and html lang/dir follow');

  // LTR layout sanity: English nav starts at the left, the Persian one at the right.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/en');
  const enLogoX = (await page.locator('.site-header .logo').boundingBox()).x;
  const enCtaX = (await page.locator('.header-actions .btn').boundingBox()).x;
  assert.ok(enLogoX < enCtaX, 'English: logo left of the call-to-action');
  await page.goto('/');
  const faLogoX = (await page.locator('.site-header .logo').boundingBox()).x;
  const faCtaX = (await page.locator('.header-actions .btn').boundingBox()).x;
  assert.ok(faLogoX > faCtaX, 'Persian: logo right of the call-to-action');
  ok('layout mirrors correctly: logo left in LTR, right in RTL');

  await page.goto('/en/contact');
  await page.getByRole('heading', { level: 1, name: 'Your next project starts here' }).waitFor();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByText('Please choose a project type.').waitFor();
  await page.getByLabel('Mobile app').check();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByLabel('Not decided yet').first().check();
  await page.locator('#timeline').selectOption('Under 3 months');
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.locator('#lead-name').fill(`English Visitor ${stamp}`);
  await page.locator('#lead-email').fill('visitor@example.com');
  await page.locator('#lead-phone').fill('+44 20 7946 0958');
  await page.locator('#lead-details').fill('We would like a mobile app for our clinic network.');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await page.getByText('Please accept').or(page.getByText('You need to accept the privacy policy.')).waitFor();
  await page.getByLabel(/I accept the privacy policy/).check();
  const [leadResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/leads')),
    page.getByRole('button', { name: 'Submit request' }).click(),
  ]);
  assert.equal(leadResponse.status(), 201);
  await page.getByText('Your request is saved. We will contact you shortly.').waitFor();
  const { rows } = await pool.query('select locale, project_type, consent_at from leads where name = $1', [`English Visitor ${stamp}`]);
  assert.equal(rows[0]?.locale, 'en', 'English lead is stored with locale=en');
  assert.equal(rows[0]?.project_type, 'Mobile app');
  assert.ok(rows[0]?.consent_at, 'consent time stored');
  ok('English lead via /en/contact: English validation + success copy, stored locale=en');

  await page.goto('/contact');
  await page.getByRole('button', { name: 'مرحله بعد' }).click();
  await page.getByText('لطفاً نوع پروژه را انتخاب کنید.').waitFor();
  ok('Persian form keeps Persian validation');

  // Missing items: correct 404 status and a localized, direction-correct page in a real browser.
  for (const [path, lang, dir, title] of [
    [`/en/blog/${onlyFaSlug}`, 'en', 'ltr', 'Page not found'],
    ['/blog/does-not-exist', 'fa', 'rtl', 'صفحه پیدا نشد'],
    ['/en/projects/does-not-exist', 'en', 'ltr', 'Page not found'],
  ]) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 404, `${path} status`);
    await page.locator('main h2', { hasText: title }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), lang, `${path}: lang after hydration`);
    assert.equal(await page.locator('html').getAttribute('dir'), dir, `${path}: dir after hydration`);
    assert.equal(await page.locator('.site-header').count(), 1, `${path}: header rendered`);
  }
  ok('missing items: 404 status + localized page with correct lang/dir/header in the browser; unmatched URLs fully server-rendered');

  // Keyboard: Tab order reaches the language switcher with a visible focus ring.
  await page.goto('/en');
  let focused = false;
  for (let i = 0; i < 14 && !focused; i += 1) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.classList.contains('lang-switch') ?? false);
  }
  assert.ok(focused, 'language switcher is keyboard reachable');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, 'none', 'focus ring must be visible');
  ok('keyboard: language switcher reachable via Tab with a visible focus outline');

  assert.deepEqual(consoleErrors, [], `console errors:\n${consoleErrors.join('\n')}`);
  ok('zero console / CSP errors across the locale browser run');
  await browser.close();
} finally {
  await pool.query('delete from posts where slug = any($1)', [[onlyFaSlug, bothSlug]]);
  await pool.query("delete from leads where name like 'English Visitor %'");
  await pool.end();
}
console.log(`LOCALE SMOKE PASSED (${results.length} groups)`);
