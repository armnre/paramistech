import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import type { Locale } from '@/lib/i18n/dictionary';
import { getDictionary } from '@/lib/i18n';
import { ogTitle, ogTitleSize } from '@/lib/og-text';
import { siteAssets } from '@/lib/site-assets';

// Text is shaped by sharp's Pango/HarfBuzz pipeline with the full Vazirmatn TTFs (src/assets/fonts, SIL OFL),
// which cover Persian and Latin. Persian cards are right-aligned; English cards mirror the whole layout.
export const ogSize = { width: 1200, height: 630 };

const PADDING = 90;
const TOP = 72;
const FOOTER_HEIGHT = 76;
const BACKGROUND = '#e6f4f1';

function fontPath(file: string) {
  return path.join(/* turbopackIgnore: true */ process.cwd(), 'src', 'assets', 'fonts', file);
}

function markup(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type Layer = { input: Buffer; width: number; height: number };

async function textLayer(
  text: string,
  options: { weight: 'ExtraBold' | 'SemiBold'; size: number; color: string; width?: number; align: 'left' | 'right' },
): Promise<Layer> {
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${options.color}">${markup(text)}</span>`,
      font: `Vazirmatn ${options.size}`,
      fontfile: fontPath(`Vazirmatn-${options.weight}.ttf`),
      width: options.width,
      rgba: true,
      align: options.align,
      wrap: 'word',
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

function svg(width: number, height: number, body: string) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`);
}

const leafMark = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${FOOTER_HEIGHT}" height="${FOOTER_HEIGHT}" viewBox="0 0 64 64">
    <path d="M12 40C12 20 29 8 56 5c0 23-13 36-35 39-4 6-6 11-7 16" fill="#0f766e"/>
    <path d="M14 59C22 35 35 21 51 12" fill="none" stroke="${BACKGROUND}" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
);

export async function renderOgCard({ title, eyebrow, locale }: { title: string; eyebrow?: string; locale: Locale }) {
  const dict = getDictionary(locale);
  const rtl = locale === 'fa';
  const align = rtl ? 'right' : 'left';
  const rightEdge = ogSize.width - PADDING;
  // x position of an element of the given width, anchored to the reading-start edge.
  const startX = (width: number) => (rtl ? rightEdge - width : PADDING);
  const layers: OverlayOptions[] = [];

  layers.push({ input: svg(64, 6, '<rect width="64" height="6" rx="3" fill="#e8b04b"/>'), left: startX(64), top: TOP });
  let cursor = TOP + 6 + 28;

  if (eyebrow) {
    const label = await textLayer(eyebrow, { weight: 'SemiBold', size: 30, color: '#0f766e', align });
    const pillWidth = label.width + 52;
    const pillHeight = label.height + 14;
    layers.push({
      input: svg(pillWidth, pillHeight, `<rect width="${pillWidth}" height="${pillHeight}" rx="${pillHeight / 2}" fill="#ffffff"/>`),
      left: startX(pillWidth),
      top: cursor,
    });
    layers.push({ input: label.input, left: startX(pillWidth) + 26, top: cursor + 7 });
    cursor += pillHeight + 24;
  }

  // Shrink the title until it fits above the footer.
  const footerTop = ogSize.height - TOP - FOOTER_HEIGHT;
  const maxHeight = footerTop - 24 - cursor;
  const titleWidth = ogSize.width - PADDING * 2;
  let size = ogTitleSize(title);
  let titleLayer = await textLayer(ogTitle(title), { weight: 'ExtraBold', size, color: '#0b1f1c', width: titleWidth, align });
  while (titleLayer.height > maxHeight && size > 36) {
    size -= 8;
    titleLayer = await textLayer(ogTitle(title), { weight: 'ExtraBold', size, color: '#0b1f1c', width: titleWidth, align });
  }
  layers.push({ input: titleLayer.input, left: startX(titleLayer.width), top: cursor });

  const brand = await textLayer(dict.site.brand, { weight: 'ExtraBold', size: 46, color: '#0b1f1c', align });
  const tagline = await textLayer(dict.site.tagline, { weight: 'SemiBold', size: 28, color: '#0f766e', align });
  const leafLeft = startX(FOOTER_HEIGHT);
  layers.push({ input: leafMark, left: leafLeft, top: footerTop });
  const brandLeft = rtl ? leafLeft - 18 - brand.width : leafLeft + FOOTER_HEIGHT + 18;
  layers.push({ input: brand.input, left: brandLeft, top: footerTop + Math.round((FOOTER_HEIGHT - brand.height) / 2) });
  // The tagline sits on the opposite edge from the brand.
  const taglineLeft = rtl ? PADDING : rightEdge - tagline.width;
  layers.push({ input: tagline.input, left: taglineLeft, top: footerTop + Math.round((FOOTER_HEIGHT - tagline.height) / 2) });

  const png = await sharp({ create: { width: ogSize.width, height: ogSize.height, channels: 4, background: BACKGROUND } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}

/** Static fallback for unknown or unpublished items, in the visitor's language. */
export async function fallbackOgImage(locale: Locale) {
  const file = locale === 'en' ? siteAssets.ogImageEn : siteAssets.ogImage;
  const bytes = await readFile(path.join(/* turbopackIgnore: true */ process.cwd(), 'public', file));
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
}
