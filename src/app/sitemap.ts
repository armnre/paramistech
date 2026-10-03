import type { MetadataRoute } from 'next';
import { getSitemapRows } from '@/lib/content';
import { buildSitemapEntries } from '@/lib/sitemap-entries';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries(await getSitemapRows());
}
