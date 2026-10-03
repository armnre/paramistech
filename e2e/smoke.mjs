// Smoke test against a running production build: visitor lead -> admin, roles, session revocation, editor publishing.
// Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node e2e/smoke.mjs
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl) && process.env.E2E_ALLOW !== 'true') {
  throw new Error('Refusing to run the smoke test against a non-local host.');
}

const stamp = Date.now();
const adminEmail = 'e2e-admin@paramistech.test';
const adminPassword = 'e2e-only-password-14';
const editorEmail = `e2e-editor-${stamp}@paramistech.test`;
const editorPassword = 'editor-only-password-14';
const leadName = `بازدیدکننده آزمایشی ${stamp}`;
const postTitle = `E2E post ${stamp}`;

execFileSync('node', ['scripts/seed-admin.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword },
});

const browser = await chromium.launch({ headless: true });
const violations = [];

async function open(email, password) {
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') violations.push(`${email}: ${message.text()}`);
  });
  await page.goto('/admin');
  await page.locator('#admin-email').fill(email);
  await page.locator('#admin-password').fill(password);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/admin/login') && response.ok()),
    page.getByRole('button', { name: 'ورود به پنل' }).click(),
  ]);
  await page.getByRole('heading', { name: 'داشبورد' }).waitFor();
  return { context, page };
}

// 1. Visitor lead is stored and visible to the admin.
const submission = await fetch(`${baseUrl}/api/leads`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectType: 'اپلیکیشن موبایل',
    budget: 'هنوز مشخص نیست',
    timeline: '۳ تا ۶ ماه',
    name: leadName,
    email: 'visitor@example.com',
    phone: '09120000000',
    details: 'این درخواست فقط برای آزمون دود خودکار ثبت شده است.',
    consent: true,
  }),
});
assert.equal(submission.status, 201, `lead submission: ${submission.status}`);

const admin = await open(adminEmail, adminPassword);
await admin.page.goto(`/admin/leads?q=${encodeURIComponent(leadName)}`);
await admin.page.getByRole('link', { name: leadName }).waitFor();
console.log('ok  visitor lead is visible to the admin');

// 2. Admin creates an editor.
await admin.page.goto('/admin/users');
await admin.page.locator('#new-email').fill(editorEmail);
await admin.page.locator('#new-role').selectOption('editor');
await admin.page.locator('#new-password').fill(editorPassword);
await admin.page.getByRole('button', { name: 'ساخت کاربر' }).click();
await admin.page.waitForURL(/\/admin\/users\?saved=1/);
console.log('ok  admin created an editor');

// 3. Editor is denied admin-only areas on the server.
const editor = await open(editorEmail, editorPassword);
for (const path of ['/admin/users', '/admin/audit', '/admin/settings']) {
  await editor.page.goto(path);
  assert.equal(new URL(editor.page.url()).pathname, '/admin', `editor should be redirected away from ${path}`);
}
const exportResponse = await editor.context.request.get('/admin/leads/export');
assert.equal(exportResponse.status(), 403, 'editor must not export leads');
const anonymous = await browser.newContext({ baseURL: baseUrl });
assert.equal((await anonymous.request.get('/admin/leads/export')).status(), 401, 'anonymous must not export leads');
const anonymousPage = await anonymous.newPage();
await anonymousPage.goto('/admin/users');
await anonymousPage.locator('#admin-email').waitFor();
console.log('ok  editor and anonymous users are denied admin-only routes');

// 4. Editor publishes a post with a cover.
const cover = await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0f766e' } }).png().toBuffer();
await editor.page.goto('/admin/posts/new');
await editor.page.locator('#title').fill(postTitle);
await editor.page.getByRole('button', { name: 'پیشنهاد نشانی' }).first().click();
const slug = await editor.page.locator('#slug').inputValue();
assert.match(slug, /^e2e-post-\d+$/);
await editor.page.locator('#excerpt').fill(`خلاصه آزمایشی ${stamp}`);
await editor.page.locator('#bodyMd').fill('## عنوان بخش\n\nمتن آزمایشی مقاله برای آزمون دود.');
await editor.page.locator('#cover').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: cover });
await editor.page.locator('#coverAlt').fill('تصویر آزمایشی');
// English section (LTR inputs): title and body make the post visible under /en.
const titleEn = `English post ${stamp}`;
assert.equal(await editor.page.locator('#titleEn').evaluate((el) => getComputedStyle(el).direction), 'ltr', 'English inputs must be LTR');
await editor.page.locator('#titleEn').fill(titleEn);
await editor.page.locator('#excerptEn').fill(`English excerpt ${stamp}`);
await editor.page.locator('#bodyMdEn').fill('## Section heading\n\nEnglish body text for the smoke test.');
await editor.page.locator('input[name=published]').check();
await editor.page.getByRole('button', { name: 'ذخیره' }).click();
await editor.page.waitForURL(/\/admin\/posts\?saved=1/);

const publicPage = await anonymous.newPage();
const postResponse = await publicPage.goto(`/blog/${slug}`);
assert.equal(postResponse?.status(), 200);
await publicPage.getByRole('heading', { name: postTitle, level: 1 }).waitFor();
console.log(`ok  editor published /blog/${slug}`);

const englishResponse = await publicPage.goto(`/en/blog/${slug}`);
assert.equal(englishResponse?.status(), 200, 'the English version must be public once title and body exist');
await publicPage.getByRole('heading', { name: titleEn, level: 1 }).waitFor();
assert.equal(await publicPage.locator('html').getAttribute('dir'), 'ltr');
console.log(`ok  editor's English text is live at /en/blog/${slug}`);

// 5. Deactivating the editor revokes the live session immediately.
await admin.page.goto('/admin/users');
await admin.page.locator('tr', { hasText: editorEmail }).getByRole('button', { name: 'غیرفعال‌سازی' }).click();
await admin.page.waitForURL(/\/admin\/users\?saved=1/);
await editor.page.goto('/admin/posts');
await editor.page.locator('#admin-email').waitFor();
console.log('ok  deactivated editor lost the session');

await browser.close();
assert.deepEqual(violations, [], `console errors:\n${violations.join('\n')}`);
console.log('SMOKE PASSED');
