import { ogSize } from '@/lib/og-card';
import { projectOgImage } from '@/views/og';

export const alt = 'ParamisTech';
export const size = ogSize;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return projectOgImage('fa', (await params).slug);
}
