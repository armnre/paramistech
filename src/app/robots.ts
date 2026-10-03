import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    // "/admin" (no trailing slash) also covers /admin itself, not only its children.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/design-system'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
