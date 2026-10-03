// Compares satori-rendered title width with Chromium's shaped width for the same string and font.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query("select title from projects where slug = 'smart-finance'");
await pool.end();
const title = rows[0].title;

const { data, info } = await sharp('artifacts/og-project.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let x0 = 9999, x1 = 0, y0 = 9999, y1 = 0;
for (let y = 150; y < 420; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const i = (y * info.width + x) * 4;
    if (data[i] < 60 && data[i + 1] < 70 && data[i + 2] < 70) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
}
const inkWidth = x1 - x0;

const font = (file) => readFileSync(`src/assets/fonts/${file}`).toString('base64');
const rightEdge = 1200 - 90;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<style>
@font-face{font-family:V;src:url(data:font/ttf;base64,${font('Vazirmatn-ExtraBold.ttf')}) format('truetype')}
span{font:92px/1.4 V;white-space:nowrap}</style><span id=t dir=rtl>${title}</span>`);
await page.evaluate(() => document.fonts.ready);
const shapedWidth = await page.evaluate(() => document.getElementById('t').getBoundingClientRect().width);
// Same text with every letter forced isolated (ZWNJ between letters disables joining).
await page.evaluate((text) => { document.getElementById('t').textContent = [...text].join('\u200c'); }, title);
const isolatedWidth = await page.evaluate(() => document.getElementById('t').getBoundingClientRect().width);
await browser.close();

console.log({ title, inkWidth, shapedWidth: Math.round(shapedWidth), isolatedWidth: Math.round(isolatedWidth) });
assert.ok(y1 - y0 < 150, `title should be a single line, ink height ${y1 - y0}`);
assert.ok(Math.abs(x1 - rightEdge) < 20, `title should be right-aligned for RTL, right edge at ${x1}`);
assert.ok(Math.abs(inkWidth - shapedWidth) / shapedWidth < 0.08, 'OG title width differs from the shaped reference');
assert.ok(Math.abs(inkWidth - shapedWidth) < Math.abs(inkWidth - isolatedWidth), 'OG title looks unjoined (isolated letter forms)');
console.log('OG SHAPING OK: letters are joined like in Chromium');
