import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { hashPassword, log, requireAdmin, type Role } from '../server/lib';

/* Which roles may touch which table (مدیر کل always may). */
const tables = {
  customers: { roles: ['مالی'], label: 'مشتری' },
  services: { roles: ['مالی'], label: 'سرویس' },
  invoices: { roles: ['مالی'], label: 'فاکتور' },
  payments: { roles: ['مالی'], label: 'پرداخت' },
  bankAccounts: { roles: ['مالی'], label: 'حساب بانکی' },
  projectRequests: { roles: ['مالی', 'محتوا'], label: 'درخواست پروژه' },
  contentItems: { roles: ['محتوا'], label: 'محتوا' },
  siteSettings: { roles: ['محتوا'], label: 'تنظیمات سایت' },
  notifications: { roles: ['مالی'], label: 'اعلان' },
  admins: { roles: [], label: 'مدیر' },
  activityLog: { roles: [], label: 'لاگ' },
} as const satisfies Record<string, { roles: Role[]; label: string }>;
type TableKey = keyof typeof tables;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = (t: TableKey) => (zite as any)[t] as { findAll: Function; findOne: Function; create: Function; update: Function; delete: Function };

async function siteMeta(url: string) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ParamisTechBot/1.0)' }, signal: AbortSignal.timeout(8000) });
    const html = (await res.text()).slice(0, 300000);
    const pick = (re: RegExp) => html.match(re)?.[1]?.trim();
    const meta = (n: string) => pick(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']+)`, 'i')) || pick(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${n}["']`, 'i'));
    const dec = (t?: string) => t?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&zwnj;/g, '\u200c');
    let image = meta('og:image');
    if (image && !/^https?:/.test(image)) image = new URL(image, url).href;
    return { title: dec(meta('og:title') || pick(/<title[^>]*>([^<]+)<\/title>/i))?.split(/\s[|–—-]\s/)[0], desc: dec(meta('og:description') || meta('description')), image };
  } catch { return {} as { title?: string; desc?: string; image?: string }; }
}

export default createEndpoint({
  description: 'Generic list/create/update/delete for admin panel tables, gated by admin role',
  inputSchema: z.object({
    token: z.string(),
    table: z.enum(Object.keys(tables) as [TableKey, ...TableKey[]]),
    action: z.enum(['list', 'get', 'save', 'delete']),
    id: z.string().optional(),
    data: z.record(z.any()).optional(),
    filters: z.record(z.any()).optional(),
    limit: z.number().optional(),
  }),
  outputSchema: z.object({ records: z.array(z.any()), record: z.any().optional() }),
  execute: async ({ input }) => {
    const cfg = tables[input.table];
    const me = await requireAdmin(input.token, cfg.roles as unknown as Role[]);
    const c = client(input.table);
    const strip = (r: Record<string, unknown>) => { const { passwordHash: _p, ...rest } = r; return rest; };

    if (input.action === 'list') {
      const sortMap: Partial<Record<TableKey, { field: string; direction: 'asc' | 'desc' }>> = {
        customers: { field: 'createdAt', direction: 'desc' }, invoices: { field: 'createdAt', direction: 'desc' }, payments: { field: 'createdAt', direction: 'desc' },
        notifications: { field: 'createdAt', direction: 'desc' }, activityLog: { field: 'createdAt', direction: 'desc' }, projectRequests: { field: 'submittedAt', direction: 'desc' },
        contentItems: { field: 'sortOrder', direction: 'asc' }, services: { field: 'nextDueDate', direction: 'asc' },
      };
      const s = sortMap[input.table];
      const { records } = await c.findAll({ filters: input.filters, limit: Math.min(input.limit ?? 1000, 2000), ...(s ? { sort: [s] } : {}) });
      return { records: records.map(strip) };
    }
    if (input.action === 'get') return { records: [], record: strip((await c.findOne({ id: input.id })) ?? {}) };

    if (input.action === 'delete') {
      if (!input.id) throw new ZiteError('id required', 'BAD_REQUEST');
      if (input.table === 'admins' && input.id === me.id) throw new ZiteError({ code: 'BAD_REQUEST', message: 'self', userFacingMessage: 'نمی‌توانید حساب خودتان را حذف کنید.' });
      await c.delete({ id: input.id });
      await log(me.username, `حذف ${cfg.label}`, input.id);
      return { records: [] };
    }

    const data: Record<string, unknown> = { ...(input.data ?? {}) };
    delete data.id; delete data.createdAt; delete data.submittedAt;
    if (input.table === 'admins' || input.table === 'customers') {
      delete data.passwordHash;
      if (typeof data.password === 'string' && data.password) {
        if (data.password.length < 8) throw new ZiteError({ code: 'BAD_REQUEST', message: 'short', userFacingMessage: 'رمز حداقل ۸ کاراکتر باشد.' });
        data.passwordHash = await hashPassword(data.password);
      }
      if (input.table === 'customers' && !input.id && !data.passwordHash) throw new ZiteError({ code: 'BAD_REQUEST', message: 'pw', userFacingMessage: 'برای مشتری جدید رمز عبور پرتال را وارد کنید.' });
      delete data.password;
      if (typeof data.username === 'string') data.username = data.username.trim().toLowerCase();
      if (input.table === 'customers' && data.username) {
        const { records: dup } = await zite.customers.findAll({ filters: { username: data.username as string }, limit: 2 });
        if (dup.some((d) => d.id !== input.id)) throw new ZiteError({ code: 'BAD_REQUEST', message: 'dup', userFacingMessage: 'این نام کاربری قبلاً برای مشتری دیگری ثبت شده است.' });
      }
    }
    if (input.table === 'contentItems' && data.kind === 'نمونه‌کار' && typeof data.link === 'string' && data.link) {
      let url = data.link.trim(); if (!/^https?:\/\//.test(url)) url = `https://${url}`; data.link = url;
      if (!data.title || !data.body || !data.image) {
        const m = await siteMeta(url);
        if (!data.title) data.title = m.title || url.replace(/^https?:\/\//, '');
        if (!data.body && m.desc) data.body = m.desc;
        if (!data.image) data.image = `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=1200&h=900`;
      }
      if (!data.projectStatus && !input.id) data.projectStatus = 'منتشرشده';
    }
    if (input.table === 'contentItems' && !data.title && !input.id) throw new ZiteError({ code: 'BAD_REQUEST', message: 'title', userFacingMessage: 'عنوان یا لینک را وارد کنید.' });
    const record = input.id ? await c.update({ id: input.id, record: data }) : await c.create({ record: data });
    await log(me.username, `${input.id ? 'ویرایش' : 'ایجاد'} ${cfg.label}`, String((data.title ?? data.name ?? data.number ?? data.key ?? data.username ?? '') || ''));
    return { records: [], record: strip({ id: record.id, ...(record.fields ?? record) }) };
  },
});
