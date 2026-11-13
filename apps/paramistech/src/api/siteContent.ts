import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { maybeRunBilling } from '../server/lib';

async function canEmbed(url: string) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(3500) });
    const xfo = res.headers.get('x-frame-options') ?? '';
    const csp = res.headers.get('content-security-policy') ?? '';
    return !/deny|sameorigin/i.test(xfo) && !/frame-ancestors[^;]*('none'|'self')/i.test(csp);
  } catch { return true; }
}

export default createEndpoint({
  description: 'Public site content managed from the admin CMS',
  inputSchema: z.object({}),
  outputSchema: z.object({
    items: z.array(z.object({ id: z.string(), title: z.string(), kind: z.string(), subtitle: z.string(), body: z.string(), image: z.string(), link: z.string(), tags: z.string(), category: z.string(), status: z.string(), featured: z.boolean(), embed: z.boolean() })),
    settings: z.record(z.string()),
  }),
  execute: async () => {
    await maybeRunBilling();
    const [{ records }, { records: s }] = await Promise.all([
      zite.contentItems.findAll({ filters: { visible: true }, sort: [{ field: 'sortOrder', direction: 'asc' }], limit: 500 }),
      zite.siteSettings.findAll({ limit: 300 }),
    ]);
    const embeds = await Promise.all(records.map((r) => r.kind === 'نمونه‌کار' && r.link ? canEmbed(r.link) : Promise.resolve(false)));
    return {
      items: records.map((r, i) => ({ embed: embeds[i], id: r.id, title: r.title ?? '', kind: r.kind ?? '', subtitle: r.subtitle ?? '', body: r.body ?? '', image: r.image ?? '', link: r.link ?? '', tags: r.tags ?? '', category: r.category ?? '', status: r.projectStatus ?? '', featured: !!r.featured })),
      settings: Object.fromEntries(s.filter((x) => x.key && !x.key.startsWith('company.')).map((x) => [x.key!, x.value ?? ''])),
    };
  },
});
