export const toman = (n?: number | null) => `${Math.round(n ?? 0).toLocaleString('fa-IR')} تومان`;
export const num = (n?: number | null) => Math.round(n ?? 0).toLocaleString('fa-IR');
export const jDate = (d?: string | null, opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!d) return '—';
  const x = new Date(d.length === 10 ? d + 'T12:00:00' : d);
  return isNaN(+x) ? '—' : new Intl.DateTimeFormat('fa-IR-u-ca-persian', opts).format(x);
};
export const jDateTime = (d?: string | null) => jDate(d, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysUntil = (d?: string | null) => (d ? Math.round((new Date(d + 'T00:00:00').getTime() - new Date(isoDate(new Date()) + 'T00:00:00').getTime()) / 86400000) : null);
export const first = (v?: string | string[] | null) => (Array.isArray(v) ? v[0] : v ?? undefined);
export const card = (c?: string | null) => (c ?? '').replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 - ');

export type InvoiceItem = { title: string; desc?: string; qty: number; price: number };
export const parseItems = (s?: string | null): InvoiceItem[] => { try { const v = JSON.parse(s ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

export const statusTone: Record<string, string> = {
  'پرداخت‌شده': 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20',
  'تأییدشده': 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20',
  'فعال': 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20',
  'موفق': 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20',
  'صادرشده': 'bg-sky-500/10 text-sky-700 ring-sky-600/20',
  'جدید': 'bg-sky-500/10 text-sky-700 ring-sky-600/20',
  'در انتظار تأیید': 'bg-amber-500/15 text-amber-700 ring-amber-600/20',
  'در انتظار بررسی': 'bg-amber-500/15 text-amber-700 ring-amber-600/20',
  'تماس گرفته شد': 'bg-amber-500/15 text-amber-700 ring-amber-600/20',
  'معوق': 'bg-red-500/10 text-red-700 ring-red-600/20',
  'ردشده': 'bg-red-500/10 text-red-700 ring-red-600/20',
  'معلق': 'bg-red-500/10 text-red-700 ring-red-600/20',
  'ناموفق': 'bg-red-500/10 text-red-700 ring-red-600/20',
};
