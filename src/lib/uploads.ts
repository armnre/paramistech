import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/db';
import { media } from '@/db/schema';
import { detectImageType } from '@/lib/image-signature';

export { detectImageType } from '@/lib/image-signature';

const MAX_BYTES = 5 * 1024 * 1024;

export function uploadsDirectory() {
  return process.env.UPLOADS_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'uploads');
}

export function safeUploadPath(filename: string) {
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) throw new Error('Invalid media path');
  return path.join(/* turbopackIgnore: true */ uploadsDirectory(), filename);
}

export async function storeImage(file: File, altText: string) {
  if (!altText.trim()) throw new Error('متن جایگزین تصویر الزامی است.');
  if (file.size <= 0 || file.size > MAX_BYTES) throw new Error('حجم تصویر باید بین ۱ بایت و ۵ مگابایت باشد.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!detectImageType(bytes)) throw new Error('فقط تصویر PNG، JPG یا WebP پذیرفته می‌شود.');

  const sharp = (await import('sharp')).default;
  const optimized = await sharp(bytes, { failOn: 'error' }).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const info = await sharp(optimized).metadata();
  const filename = `${randomUUID()}.webp`;
  await mkdir(/* turbopackIgnore: true */ uploadsDirectory(), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ safeUploadPath(filename), optimized);
  const [row] = await db.insert(media).values({
    path: filename,
    mime: 'image/webp',
    size: optimized.length,
    width: info.width || 1,
    height: info.height || 1,
    altText: altText.trim(),
  }).returning();
  return row;
}
