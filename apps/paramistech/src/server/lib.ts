import { zite } from 'zitejs/db';
import { ZiteError } from 'zitejs/backend';

/* ---------------- crypto helpers (WebCrypto, Worker-safe) ---------------- */
const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(process.env.ZITE_ADMIN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${b64u(salt)}$${b64u(bits)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, saltS, hashS] = stored.split('$');
  if (!saltS || !hashS) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromB64u(saltS), iterations: 100000, hash: 'SHA-256' }, key, 256);
  const a = b64u(bits);
  if (a.length !== hashS.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ hashS.charCodeAt(i);
  return diff === 0;
}

export async function signToken(adminId: string) {
  const payload = b64u(enc.encode(JSON.stringify({ id: adminId, exp: Date.now() + 1000 * 60 * 60 * 12 })));
  return `${payload}.${await hmac(payload)}`;
}

/** Customer portal session (30 days), distinguished from admin tokens by `typ`. */
export async function signCustomerToken(customerId: string) {
  const payload = b64u(enc.encode(JSON.stringify({ id: customerId, typ: 'c', exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })));
  return `${payload}.${await hmac(payload)}`;
}

export async function requireCustomer(token: string | undefined) {
  const deny = () => new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid customer session', userFacingMessage: 'نشست شما منقضی شده؛ دوباره وارد شوید.' });
  if (!token || !token.includes('.')) throw deny();
  const [payload, sig] = token.split('.');
  if ((await hmac(payload)) !== sig) throw deny();
  const data = JSON.parse(new TextDecoder().decode(fromB64u(payload))) as { id: string; typ?: string; exp: number };
  if (data.typ !== 'c' || data.exp < Date.now()) throw deny();
  const c = await zite.customers.findOne({ id: data.id });
  if (!c || !c.active) throw deny();
  return c;
}

export type Role = 'مدیر کل' | 'مالی' | 'محتوا';
export type AdminCtx = { id: string; username: string; name: string; role: Role };

/** Verifies the admin session token and (optionally) the role. Throws on failure. */
export async function requireAdmin(token: string | undefined, roles?: Role[]): Promise<AdminCtx> {
  const deny = () => new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid admin session', userFacingMessage: 'نشست شما منقضی شده؛ دوباره وارد شوید.' });
  if (!token || !token.includes('.')) throw deny();
  const [payload, sig] = token.split('.');
  if ((await hmac(payload)) !== sig) throw deny();
  const data = JSON.parse(new TextDecoder().decode(fromB64u(payload))) as { id: string; typ?: string; exp: number };
  if (data.typ || data.exp < Date.now()) throw deny();
  const a = await zite.admins.findOne({ id: data.id });
  if (!a || !a.active) throw deny();
  const ctx = { id: a.id, username: a.username ?? '', name: a.displayName || a.username || '', role: (a.role ?? 'محتوا') as Role };
  if (roles && ctx.role !== 'مدیر کل' && !roles.includes(ctx.role)) {
    throw new ZiteError({ code: 'FORBIDDEN', message: 'Role not allowed', userFacingMessage: 'دسترسی به این بخش برای نقش شما مجاز نیست.' });
  }
  return ctx;
}

export const log = (actor: string, action: string, details = '') => zite.activityLog.create({ record: { actor, action, details } });

/* ---------------- date & billing helpers ---------------- */
export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const months: Record<string, number> = { 'ماهانه': 1, 'سه‌ماهه': 3, 'شش‌ماهه': 6, 'سالانه': 12 };
export const advance = (d: string, period?: string) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + (months[period ?? ''] ?? 1)); return x.toISOString().slice(0, 10); };
export const faDate = (d: string) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d + 'T12:00:00Z'));
export const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export async function nextInvoiceNumber() {
  const { rows } = await zite.sql({ query: 'SELECT COUNT(*)::int AS n FROM "Invoices"' });
  const y = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric' }).format(new Date()).replace(/\D/g, '');
  return `PT-${y}-${String(Number(rows[0]?.n ?? 0) + 1).padStart(4, '0')}`;
}

export async function notify(n: { title: string; body: string; audience: 'مشتری' | 'ادمین'; customer?: string; link?: string }) {
  await zite.notifications.create({ record: { title: n.title, body: n.body, audience: n.audience, customer: n.customer ?? null, link: n.link ?? null, read: false } });
}

/** Issues invoices for services due within 3 days, and marks overdue invoices. Idempotent. */
export async function runBillingCycle() {
  const horizon = addDays(today(), 3);
  const { records: due } = await zite.services.findAll({ filters: { status: 'فعال', autoRenew: true, nextDueDate: { lte: horizon } }, limit: 500 });
  let issued = 0;
  for (const s of due) {
    if (!s.nextDueDate) continue;
    const customer = first(s.customer);
    const label = `${s.billingPeriod ?? 'دوره'} — سررسید ${faDate(s.nextDueDate)}`;
    const { records: existing } = await zite.invoices.findAll({ filters: { service: s.id, dueDate: s.nextDueDate }, limit: 1 });
    if (existing.length) continue;
    const number = await nextInvoiceNumber();
    const items = [{ title: `${s.title}${s.domain ? ` (${s.domain})` : ''}`, desc: label, qty: 1, price: s.amount ?? 0 }];
    await zite.invoices.create({ record: { number, customer: customer ?? null, service: s.id, issueDate: today(), dueDate: s.nextDueDate, status: 'صادرشده', items: JSON.stringify(items), discount: 0, total: s.amount ?? 0, periodLabel: label, remindersSent: 0 } });
    if (customer) await notify({ audience: 'مشتری', customer, title: `فاکتور ${number} صادر شد`, body: `فاکتور تمدید «${s.title}» به مبلغ ${(s.amount ?? 0).toLocaleString('fa-IR')} تومان صادر شد. مهلت پرداخت: ${faDate(s.nextDueDate)}`, link: `/portal/invoices` });
    issued++;
  }
  const { records: late } = await zite.invoices.findAll({ filters: { status: 'صادرشده', dueDate: { lt: today() } }, limit: 500 });
  for (const inv of late) {
    await zite.invoices.update({ id: inv.id, record: { status: 'معوق', remindersSent: (inv.remindersSent ?? 0) + 1 } });
    const c = first(inv.customer);
    if (c) await notify({ audience: 'مشتری', customer: c, title: `یادآوری: فاکتور ${inv.number} معوق شد`, body: 'مهلت پرداخت این فاکتور گذشته است. لطفاً هرچه زودتر پرداخت و رسید را ثبت کنید تا سرویس شما بدون وقفه ادامه یابد.', link: '/portal/invoices' });
  }
  return { issued, overdue: late.length };
}

/** Free-plan replacement for a cron job: runs the billing cycle at most once every 6 hours,
 *  triggered by normal traffic (site visits, portal opens, admin dashboard). */
export async function maybeRunBilling() {
  try {
    const KEY = 'billing.lastRun';
    const { records } = await zite.siteSettings.findAll({ filters: { key: KEY }, limit: 1 });
    const last = records[0]?.value ? Date.parse(records[0].value) : 0;
    if (Date.now() - last < 6 * 3600_000) return;
    const stamp = new Date().toISOString();
    await zite.siteSettings.bulkCreate({ records: [{ key: KEY, value: stamp }], matchOn: ['key'] });
    await runBillingCycle();
  } catch (e) {
    console.error('auto billing failed', e);
  }
}
