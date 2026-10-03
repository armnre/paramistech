// Generates every file in public/ that metadata references, from src/app/icon.svg.
// Usage: node scripts/generate-assets.mjs   (requires `npx playwright install chromium`)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const iconSvg = readFileSync(path.join(root, 'src/app/icon.svg'));

async function renderIcon(size, { flatten = false } = {}) {
  let image = sharp(iconSvg, { density: Math.ceil((72 * size) / 64) }).resize(size, size);
  if (flatten) image = image.flatten({ background: '#fafaf7' });
  return image.png({ compressionLevel: 9 }).toBuffer();
}

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const directory = entries.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size;
    entry[1] = size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...directory, ...entries.map((entry) => entry.data)]);
}

function fontBase64(pkg, file) {
  return readFileSync(path.join(root, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64');
}

const arabicRange = 'U+0600-06FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE80-FEFC';
const latinRange = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122';

function ogHtml(locale) {
  const en = locale === 'en';
  const brand = en ? 'ParamisTech' : 'پارامیس‌تک';
  const tagline = en ? 'Where technology builds paradise' : 'جایی که تکنولوژی بهشت را می‌سازد';
  const subline = en ? '' : 'ParamisTech';
  const face = (family, weight, file, range, pkg = 'vazirmatn') => `
    @font-face { font-family: '${family}'; font-weight: ${weight}; src: url(data:font/woff;base64,${fontBase64(pkg, file)}) format('woff'); unicode-range: ${range}; }`;
  return `<!doctype html>
<html lang="${en ? 'en' : 'fa'}" dir="${en ? 'ltr' : 'rtl'}">
<head>
<meta charset="utf-8" />
<style>
  ${face('Vazirmatn', 800, 'vazirmatn-arabic-800-normal.woff', arabicRange)}
  ${face('Vazirmatn', 800, 'vazirmatn-latin-800-normal.woff', latinRange)}
  ${face('Vazirmatn', 600, 'vazirmatn-arabic-600-normal.woff', arabicRange)}
  ${face('Vazirmatn', 600, 'vazirmatn-latin-600-normal.woff', latinRange)}
  ${face('Inter', 700, 'inter-latin-700-normal.woff', latinRange, 'inter')}
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { background: #e6f4f1; position: relative; font-family: Vazirmatn, sans-serif; color: #0b1f1c; }
  .ring { position: absolute; border: 2px solid rgba(15,118,110,.09); border-radius: 50%; }
  .row { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 110px; }
  .gold { width: 64px; height: 6px; border-radius: 6px; background: #e8b04b; margin-bottom: 30px; }
  h1 { margin: 0; font-size: ${en ? 112 : 150}px; font-weight: 800; line-height: 1.3; letter-spacing: ${en ? -2 : -4}px; }
  p { margin: 14px 0 0; font-size: ${en ? 40 : 46}px; font-weight: 600; line-height: 1.6; color: #0f766e; }
  .latin { margin-top: 30px; font-family: Inter, sans-serif; font-weight: 700; font-size: 34px; color: #5b6b67; direction: ${en ? 'rtl' : 'ltr'}; text-align: ${en ? 'left' : 'right'}; letter-spacing: -1px; }
</style>
</head>
<body>
  <div class="ring" style="width:900px;height:900px;left:-300px;top:-130px"></div>
  <div class="ring" style="width:620px;height:620px;left:-160px;top:5px"></div>
  <div class="row">
    <div>
      <div class="gold"></div>
      <h1>${brand}</h1>
      <p>${tagline}</p>
      <div class="latin">${subline}</div>
    </div>
    <svg width="330" height="330" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M12 40C12 20 29 8 56 5c0 23-13 36-35 39-4 6-6 11-7 16" fill="#0f766e" />
      <path d="M14 59C22 35 35 21 51 12" fill="none" stroke="#e6f4f1" stroke-width="3" stroke-linecap="round" />
    </svg>
  </div>
</body>
</html>`;
}

async function renderOg(locale) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(ogHtml(locale), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const sample = locale === 'en' ? 'ParamisTech' : 'پارامیس';
    const report = await page.evaluate(({ text, needInter }) => ({
      vazirmatn: document.fonts.check('800 40px Vazirmatn', text),
      // The English card sets everything in Vazirmatn; only the Persian card has an Inter subline.
      inter: !needInter || document.fonts.check('700 20px Inter', 'Param'),
      boxes: ['.gold', 'h1', 'p', '.latin', 'svg'].map((selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return `${selector}: x=${Math.round(rect.x)} y=${Math.round(rect.y)} w=${Math.round(rect.width)} h=${Math.round(rect.height)}`;
      }),
    }), { text: sample, needInter: locale !== 'en' });
    console.log(report.boxes.join('\n'));
    if (!report.vazirmatn || !report.inter) throw new Error(`Embedded fonts did not load for the ${locale} OG card`);
    return await page.screenshot({ type: 'png' });
  } finally {
    await browser.close();
  }
}

const icon32 = await renderIcon(32);
const files = {
  'favicon-32.png': icon32,
  'favicon.ico': buildIco([
    { size: 16, data: await renderIcon(16) },
    { size: 32, data: icon32 },
    { size: 48, data: await renderIcon(48) },
  ]),
  'apple-touch-icon.png': await renderIcon(180, { flatten: true }),
  'icon-192.png': await renderIcon(192),
  'icon-512.png': await renderIcon(512),
  'og.png': await renderOg('fa'),
  'og-en.png': await renderOg('en'),
};

for (const [name, data] of Object.entries(files)) {
  writeFileSync(path.join(publicDir, name), data);
  console.log(`wrote public/${name} (${data.length} bytes)`);
}
