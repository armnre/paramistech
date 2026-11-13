/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { StatusBadge } from '../components/StatusBadge';
import { first, jDate, jDateTime, toman } from '../lib/format';
import { DataTable, PageHead, Panel } from './kit';
import { errMsg, useApi, useList } from './session';

export default function Payments() {
  const api = useApi();
  const { rows, reload } = useList('payments');
  const { rows: customers } = useList('customers');
  const { rows: invoices } = useList('invoices');
  const [sel, setSel] = useState<any>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'' | 'ok' | 'no'>('');
  const cname = useMemo(() => Object.fromEntries((customers ?? []).map((c) => [c.id, c.name])), [customers]);
  const inum = useMemo(() => Object.fromEntries((invoices ?? []).map((c) => [c.id, c.number])), [invoices]);
  const data = useMemo(() => rows?.map((r) => ({ ...r, customerName: cname[first(r.customer) ?? ''] ?? '—', invoiceNumber: inum[first(r.invoice) ?? ''] ?? '—' })) ?? null, [rows, cname, inum]);
  const pending = (data ?? []).filter((r) => r.status === 'در انتظار بررسی');

  const review = async (approve: boolean) => {
    if (!approve && !note.trim()) return toast.error('دلیل رد را بنویسید تا برای مشتری ارسال شود');
    setBusy(approve ? 'ok' : 'no');
    try { await api.finance({ action: 'reviewPayment', id: sel.id, approve, note }); toast.success(approve ? 'پرداخت تأیید شد و فاکتور تسویه شد' : 'رسید رد شد و به مشتری اطلاع داده شد'); setSel(null); setNote(''); reload(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const img = (r: any) => r?.receipt?.[0]?.url as string | undefined;

  return (
    <>
      <PageHead title="رسیدها و پرداخت‌ها" desc="رسیدهای کارت‌به‌کارت ارسالی مشتریان را بررسی و تأیید کنید" />
      {pending.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-black">در انتظار بررسی ({pending.length.toLocaleString('fa-IR')})</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pending.map((p) => (
              <Panel key={p.id} className="overflow-hidden">
                <button onClick={() => setSel(p)} className="block aspect-[16/10] w-full bg-muted">{img(p) ? <img src={img(p)} alt="رسید" className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">بدون تصویر</span>}</button>
                <div className="p-4">
                  <div className="flex items-center justify-between"><p className="font-black">{p.customerName}</p><p className="font-black tabular-nums">{toman(p.amount)}</p></div>
                  <p className="mt-1 text-xs text-muted-foreground">فاکتور <span dir="ltr">{p.invoiceNumber}</span> · کد پیگیری {p.trackingCode}</p>
                  <Button className="mt-3 h-10 w-full rounded-xl font-bold" onClick={() => setSel(p)}>بررسی رسید</Button>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}
      <DataTable rows={data} tabs={['در انتظار بررسی', 'تأییدشده', 'ردشده']} tabKey="status" searchKeys={['trackingCode', 'customerName', 'invoiceNumber']} onRow={setSel} cols={[
        { key: 'customerName', label: 'مشتری', render: (r) => <span className="font-bold">{r.customerName}</span> },
        { key: 'invoiceNumber', label: 'فاکتور', render: (r) => <span dir="ltr">{r.invoiceNumber}</span> },
        { key: 'amount', label: 'مبلغ', render: (r) => <span className="tabular-nums">{toman(r.amount)}</span> },
        { key: 'trackingCode', label: 'کد پیگیری', hideSm: true },
        { key: 'createdAt', label: 'ارسال', hideSm: true, render: (r) => jDateTime(r.createdAt) },
        { key: 'status', label: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> },
      ]} />

      <Dialog open={!!sel} onOpenChange={(o) => { if (!o) { setSel(null); setNote(''); } }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl">
          {sel && <>
            <DialogHeader><DialogTitle className="text-right text-xl font-black">رسید {sel.customerName}</DialogTitle></DialogHeader>
            <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
              <a href={img(sel)} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-2xl bg-muted">
                {img(sel) ? <img src={img(sel)} alt="رسید" className="max-h-[60vh] w-full object-contain" /> : <p className="p-10 text-center text-sm">تصویری ارسال نشده</p>}
                <span className="absolute left-3 top-3 rounded-full bg-card p-2 opacity-0 shadow-soft transition-opacity group-hover:opacity-100"><ExternalLink className="h-4 w-4" /></span>
              </a>
              <div className="space-y-3 text-sm">
                {[['مبلغ', toman(sel.amount)], ['فاکتور', sel.invoiceNumber], ['کد پیگیری', sel.trackingCode], ['تاریخ واریز', jDate(sel.paidDate)], ['کارت پرداخت‌کننده', sel.payerCard || '—'], ['ارسال‌شده', jDateTime(sel.createdAt)]].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{l}</span><span className="font-bold">{v}</span></div>
                ))}
                <div className="flex justify-between"><span className="text-muted-foreground">وضعیت</span><StatusBadge s={sel.status} /></div>
                {sel.reviewNote && <p className="rounded-xl bg-muted p-3 text-xs">یادداشت: {sel.reviewNote} {sel.reviewedBy && `— ${sel.reviewedBy}`}</p>}
                {sel.status === 'در انتظار بررسی' && <>
                  <Textarea rows={2} placeholder="یادداشت / دلیل رد (برای رد الزامی)" className="rounded-xl" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button disabled={!!busy} onClick={() => review(true)} className="h-11 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">{busy === 'ok' ? <Loader2 className="animate-spin" /> : <Check className="h-4 w-4" />}تأیید</Button>
                    <Button disabled={!!busy} variant="outline" onClick={() => review(false)} className="h-11 rounded-xl font-bold text-destructive">{busy === 'no' ? <Loader2 className="animate-spin" /> : <X className="h-4 w-4" />}رد</Button>
                  </div>
                </>}
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}
