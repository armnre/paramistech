import { ogSize } from '@/lib/og-card';
import { postOgImage } from '@/views/og';

export const alt = 'ParamisTech';
export const size = ogSize;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return postOgImage('en', (await params).slug);
}
