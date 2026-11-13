import { Logo } from './ui-bits';
import { StatusBadge } from './StatusBadge';
import { card, jDate, num, parseItems, toman } from '../lib/format';

export type InvoiceDoc = { number?: string; issueDate?: string; dueDate?: string; status?: string; items?: string; discount?: number; total?: number; periodLabel?: string; notes?: string; paidAt?: string };
export type Party = { name?: string; contactName?: string; email?: string; phone?: string; address?: string; nationalId?: string };
export type Bank = { title?: string; holderName?: string; cardNumber?: string; sheba?: string; bankName?: string };

/** A print-ready, professional digital invoice used in both admin and the customer portal. */
export function InvoiceDocument({ inv, customer, company, banks }: { inv: InvoiceDoc; customer?: Party; company?: Record<string, string>; banks?: Bank[] }) {
  const items = parseItems(inv.items);
  const subtotal = items.reduce((a, b) => a + b.qty * b.price, 0);
  const paid = inv.status === 'پرداخت‌شده';
  return (
    <div id="invoice-print" className="relative overflow-hidden rounded-3xl border border-border bg-card text-foreground shadow-soft print:rounded-none print:border-0 print:shadow-none">
      <div className="bg-foreground px-6 py-7 text-background md:px-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/10"><Logo dark className="h-8 w-8" /></span>
            <div><p className="text-xl font-black">{company?.name || 'پارامیس‌تک'}</p><p className="font-serif-en text-sm text-background/50" dir="ltr">Software & Design Studio</p></div>
          </div>
          <div className="text-left">
            <p className="text-xs text-background/50">صورتحساب الکترونیکی</p>
            <p className="mt-1 text-2xl font-black tracking-tight" dir="ltr">{inv.number}</p>
            <div className="mt-2"><StatusBadge s={inv.status} className="bg-background/10 text-background ring-background/20" /></div>
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-accent" />

      <div className="space-y-8 p-6 md:p-10">
        <div className="grid gap-6 sm:grid-cols-3">
          <Meta label="تاریخ صدور" v={jDate(inv.issueDate)} />
          <Meta label="مهلت پرداخت" v={jDate(inv.dueDate)} strong />
          <Meta label="دوره" v={inv.periodLabel || '—'} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PartyBox title="صادرکننده" p={{ name: company?.name || 'پارامیس‌تک', address: company?.address, phone: company?.phone, email: company?.email, nationalId: company?.nationalId }} />
          <PartyBox title="صورتحساب برای" p={customer ?? {}} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b-2 border-foreground text-right text-xs text-muted-foreground">
              <th className="py-3 font-bold">#</th><th className="py-3 font-bold">شرح خدمت</th><th className="py-3 text-center font-bold">تعداد</th><th className="py-3 text-left font-bold">مبلغ واحد</th><th className="py-3 text-left font-bold">جمع</th>
            </tr></thead>
            <tbody>{items.map((it, i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="py-4 text-muted-foreground">{num(i + 1)}</td>
                <td className="py-4"><p className="font-bold">{it.title}</p>{it.desc && <p className="mt-0.5 text-xs text-muted-foreground">{it.desc}</p>}</td>
                <td className="py-4 text-center tabular-nums">{num(it.qty)}</td>
                <td className="py-4 text-left tabular-nums">{num(it.price)}</td>
                <td className="py-4 text-left font-bold tabular-nums">{num(it.qty * it.price)}</td>
              </tr>))}</tbody>
          </table>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm space-y-3">
            {!paid && banks && banks.length > 0 && (
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs font-bold text-muted-foreground">اطلاعات واریز</p>
                {banks.map((b, i) => (
                  <div key={i} className="mt-2 text-sm">
                    <p className="text-lg font-black tracking-wider tabular-nums" dir="ltr">{card(b.cardNumber)}</p>
                    <p className="text-muted-foreground">{b.holderName} — {b.bankName}</p>
                    {b.sheba && <p className="mt-1 text-xs text-muted-foreground" dir="ltr">IR{b.sheba.replace(/^IR/i, '')}</p>}
                  </div>
                ))}
              </div>
            )}
            {(inv.notes || company?.invoiceNote) && <p className="text-xs leading-6 text-muted-foreground">{inv.notes || company?.invoiceNote}</p>}
          </div>
          <div className="w-full space-y-2 text-sm sm:w-72">
            <Row l="جمع اقلام" v={toman(subtotal)} />
            {!!inv.discount && <Row l="تخفیف" v={`− ${toman(inv.discount)}`} />}
            <div className="flex items-center justify-between rounded-2xl bg-foreground px-4 py-3.5 text-background"><span className="font-bold">مبلغ قابل پرداخت</span><span className="text-lg font-black tabular-nums">{toman(inv.total)}</span></div>
            {paid && inv.paidAt && <p className="text-center text-xs text-muted-foreground">پرداخت‌شده در {jDate(inv.paidAt)}</p>}
          </div>
        </div>
      </div>

      {paid && <div className="pointer-events-none absolute left-8 top-36 -rotate-12 rounded-2xl border-4 border-emerald-600/70 px-5 py-2 text-2xl font-black text-emerald-600/70 md:left-16">پرداخت شد</div>}
      <div className="border-t border-dashed border-border px-6 py-4 text-center text-[11px] text-muted-foreground md:px-10">این صورتحساب به‌صورت الکترونیکی صادر شده و نیاز به مهر و امضا ندارد.</div>
    </div>
  );
}

const Meta = ({ label, v, strong }: { label: string; v: string; strong?: boolean }) => <div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 ${strong ? 'font-black' : 'font-bold'}`}>{v}</p></div>;
const Row = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between px-1"><span className="text-muted-foreground">{l}</span><span className="font-bold tabular-nums">{v}</span></div>;
function PartyBox({ title, p }: { title: string; p: Party }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      <p className="mt-2 font-black">{p.name || '—'}</p>
      <div className="mt-1 space-y-0.5 text-xs leading-6 text-muted-foreground">
        {p.contactName && <p>{p.contactName}</p>}
        {p.nationalId && <p>شناسه ملی: {p.nationalId}</p>}
        {p.phone && <p dir="ltr" className="text-right">{p.phone}</p>}
        {p.email && <p dir="ltr" className="text-right">{p.email}</p>}
        {p.address && <p>{p.address}</p>}
      </div>
    </div>
  );
}
