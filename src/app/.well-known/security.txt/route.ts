import { getContact } from '@/lib/content';
import { siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * RFC 9116 security.txt. The contact is never invented: it comes from SECURITY_CONTACT, or from the
 * published (non-placeholder) contact email in settings. Without either, the file does not exist (404).
 */
export async function GET() {
  const contact = process.env.SECURITY_CONTACT?.trim() || (await getContact('fa'))?.email?.trim();
  if (!contact) return new Response('Not found', { status: 404 });
  const target = /^https?:\/\//.test(contact) ? contact : `mailto:${contact}`;
  const expires = new Date(Date.now() + YEAR_MS - 24 * 60 * 60 * 1000).toISOString();
  const body = [`Contact: ${target}`, `Expires: ${expires}`, 'Preferred-Languages: fa, en', `Canonical: ${siteUrl()}/.well-known/security.txt`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
