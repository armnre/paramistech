/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BellOff, Check, Copy, Globe, Loader2, Printer, Receipt, Server, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from 'zitejs/upload';
import { call } from './session';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { DatePicker } from '@project/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { StatusBadge } from '../components/StatusBadge';
import { card, daysUntil, isoDate, jDate, jDateTime, num, toman } from '../lib/format';
import { usePortal } from './PortalApp';

const open = (s?: string) => ['صادرشده', 'معوق'].includes(s ?? '');
const Box = ({ className = '', children }: { className?: string; children: React.ReactNode }) => <div className={`rounded-3xl border border-border bg-card p-5 shadow-soft ${className}`}>{children}</div>;

function InvoiceRow({ i }: { i: any }) {
  const n = daysUntil(i.dueDate);
  return (
    <Link to={`/portal/invoices/${i.id}`} className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-muted">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted"><Receipt className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{i.periodLabel || 'فاکتور'}</p><p className="text-xs text-muted-foreground"><span dir="ltr">{i.number}</span> · {open(i.status) && n !== null ? (n < 0 ? `${num(-n)} روز گذشته` : n === 0 ? 'امروز' : `${num(n)} روز مانده`) : jDate(i.dueDate)}</p></div>
      <div className="text-left"><p className="text-sm font-black tabular-nums">{num(i.total)}</p><StatusBadge s={i.status} className="mt-1" /></div>
    </Link>
  );
}

export function PortalHome() {
  const { data } = usePortal();
  const due = data.invoices.filter((i: any) => open(i.status));
  const balance = due.reduce((a: number, b: any) => a + (b.total ?? 0), 0);
  return (
    <div className="space-y-5">
      <div><p className="text-sm text-muted-foreground">سلام{data.customer.contactName ? ` ${data.customer.contactName}` : ''} 👋</p><h1 className="text-2xl font-black">{data.customer.name}</h1></div>
      <div className="bg-brand relative overflow-hidden rounded-3xl p-6 text-white shadow-soft">
        <div className="bg-dots absolute inset-0 opacity-20" />
        <div className="relative">
          <p className="text-sm text-white/70">مبلغ قابل پرداخت</p>
          <p className="mt-1 text-4xl font-black tabular-nums">{num(balance)} <span className="text-base font-medium text-white/70">تومان</span></p>
          <p className="mt-2 text-sm text-white/70">{due.length ? `${num(due.length)} فاکتور در انتظار پرداخت` : 'همه فاکتورها پرداخت شده‌اند ✓'}</p>
          {due[0] && <Button asChild className="mt-5 h-11 rounded-xl bg-white font-bold text-foreground hover:bg-white/90"><Link to={`/portal/invoices/${due[0].id}`}>پرداخت فاکتور <ArrowLeft className="h-4 w-4" /></Link></Button>}
        </div>
      </div>
      <div>
        <p className="mb-3 font-black">سرویس‌های من</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.services.length === 0 && <Box className="text-sm text-muted-foreground">سرویس فعالی ندارید.</Box>}
          {data.services.map((s: any) => { const n = daysUntil(s.nextDueDate); return (
            <Box key={s.id}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-accent">{s.kind === 'دامنه' ? <Globe className="h-5 w-5" /> : <Server className="h-5 w-5" />}</span>
                <div className="flex-1"><p className="font-black">{s.title}</p>{s.domain && <a href={`https://${s.domain}`} target="_blank" rel="noreferrer" dir="ltr" className="text-xs text-muted-foreground hover:underline">{s.domain}</a>}</div>
                <StatusBadge s={s.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-muted p-3"><p className="text-muted-foreground">سررسید بعدی</p><p className="mt-0.5 font-bold">{jDate(s.nextDueDate)}</p>{n !== null && <p className={`mt-0.5 ${n <= 3 ? 'font-bold text-destructive' : 'text-muted-foreground'}`}>{n < 0 ? `${num(-n)} روز گذشته` : `${num(n)} روز دیگر`}</p>}</div>
                <div className="rounded-xl bg-muted p-3"><p className="text-muted-foreground">مبلغ {s.billingPeriod}</p><p className="mt-0.5 font-bold">{toman(s.amount)}</p></div>
              </div>
            </Box>); })}
        </div>
      </div>
      <Box className="p-2">
        <div className="flex items-center justify-between px-3 pt-2"><p className="font-black">آخرین فاکتورها</p><Link to="/portal/invoices" className="text-xs font-bold text-muted-foreground">همه</Link></div>
        {data.invoices.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">هنوز فاکتوری ندارید</p> : data.invoices.slice(0, 4).map((i: any) => <InvoiceRow key={i.id} i={i} />)}
      </Box>
    </div>
  );
}

export function PortalInvoices() {
  const { data } = usePortal();
  const [f, setF] = useState('همه');
  const list = data.invoices.filter((i: any) => f === 'همه' || (f === 'پرداخت‌نشده' ? open(i.status) : i.status === f));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">فاکتورها</h1>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">{['همه', 'پرداخت‌نشده', 'در انتظار تأیید', 'پرداخت‌شده'].map((x) => <button key={x} onClick={() => setF(x)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${f === x ? 'bg-foreground text-background' : 'bg-card text-muted-foreground ring-1 ring-border'}`}>{x}</button>)}</div>
      <Box className="p-2">{list.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">فاکتوری در این دسته نیست</p> : list.map((i: any) => <InvoiceRow key={i.id} i={i} />)}</Box>
    </div>
  );
}

export function PortalInvoice() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data } = usePortal();
  const [pay, setPay] = useState(false);
  const inv = data.invoices.find((i: any) => i.id === id);
  if (!inv) return <p className="py-20 text-center text-muted-foreground">فاکتور پیدا نشد.</p>;
  const pays = data.payments.filter((p: any) => p.invoice === inv.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => nav('/portal/invoices')}><ArrowRight className="h-5 w-5" /></Button>
        <h1 className="flex-1 text-xl font-black">فاکتور <span dir="ltr">{inv.number}</span></h1>
        <Button variant="outline" className="rounded-xl" onClick={() => window.print()}><Printer className="h-4 w-4" /><span className="hidden sm:inline">چاپ / PDF</span></Button>
      </div>
      {open(inv.status) && (
        <div className="flex flex-col gap-3 rounded-3xl bg-foreground p-5 text-background sm:flex-row sm:items-center print:hidden">
          <div className="flex-1"><p className="font-black">پرداخت با کارت‌به‌کارت</p><p className="text-sm text-background/60">مبلغ {toman(inv.total)} را به کارت زیر واریز و رسید را ثبت کنید.</p></div>
          <Button onClick={() => setPay(true)} className="h-11 rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90"><Upload className="h-4 w-4" />ثبت رسید پرداخت</Button>
        </div>
      )}
      {inv.status === 'در انتظار تأیید' && <div className="rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold text-amber-800 print:hidden">رسید شما دریافت شد و در حال بررسی است. پس از تأیید به شما اطلاع می‌دهیم.</div>}
      {pays.filter((p: any) => p.status === 'ردشده').slice(0, 1).map((p: any) => <div key={p.id} className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive print:hidden">رسید قبلی (کد {p.trackingCode}) تأیید نشد{p.reviewNote ? `: ${p.reviewNote}` : ''}</div>)}
      <InvoiceDocument inv={inv} customer={data.customer} company={data.company} banks={data.banks} />
      <PayDialog open={pay} onOpenChange={setPay} inv={inv} />
    </div>
  );
}

function PayDialog({ open: o, onOpenChange, inv }: { open: boolean; onOpenChange: (o: boolean) => void; inv: any }) {
  const { data, reload } = usePortal();
  const { upload, isUploading } = useUpload();
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [code, setCode] = useState('');
  const [card4, setCard4] = useState('');
  const [date, setDate] = useState<string | null>(isoDate(new Date()));
  const [busy, setBusy] = useState(false);
  const copy = (t: string) => { navigator.clipboard.writeText(t.replace(/\D/g, '')); toast.success('کپی شد'); };
  const submit = async () => {
    if (!file || code.trim().length < 4) return toast.error('تصویر رسید و کد پیگیری را وارد کنید');
    setBusy(true);
    try { await call({ action: 'submitPayment', invoiceId: inv.id, trackingCode: code, payerCard: card4, paidDate: date ?? undefined, receiptUrl: file.url, receiptName: file.name }); await reload(); toast.success('رسید ثبت شد؛ پس از بررسی اطلاع می‌دهیم'); onOpenChange(false); }
    catch (e: any) { toast.error(e?.userFacingMessage || 'ثبت ناموفق بود'); } finally { setBusy(false); }
  };
  return (
    <Dialog open={o} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92vh] max-w-md overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle className="text-right text-xl font-black">ثبت رسید پرداخت</DialogTitle></DialogHeader>
        <div className="rounded-2xl bg-muted p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">مبلغ</span><span className="font-black">{toman(inv.total)}</span></div>
          {data.banks.map((b: any, i: number) => (
            <div key={i} className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <div><p className="font-black tabular-nums" dir="ltr">{card(b.cardNumber)}</p><p className="text-xs text-muted-foreground">{b.holderName} — {b.bankName}</p></div>
              <Button size="icon" variant="outline" className="rounded-xl" onClick={() => copy(b.cardNumber)}><Copy className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border p-5 text-center text-sm hover:bg-muted">
          {file ? <><img src={file.url} alt="رسید" className="max-h-40 rounded-xl" /><span className="flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="h-3 w-3" />آپلود شد — برای تغییر بزنید</span></>
            : <>{isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-muted-foreground" />}<span className="font-bold">تصویر رسید را انتخاب کنید</span><span className="text-xs text-muted-foreground">اسکرین‌شات یا عکس رسید بانکی</span></>}
          <input type="file" accept="image/*,application/pdf" hidden disabled={isUploading} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const { url } = await upload(f); setFile({ url, name: f.name }); } catch { toast.error('آپلود ناموفق بود'); } }} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>کد پیگیری / شماره مرجع *</Label><Input dir="ltr" className="mt-2 h-11 rounded-xl" value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div><Label>۴ رقم آخر کارت شما</Label><Input dir="ltr" maxLength={4} inputMode="numeric" className="mt-2 h-11 rounded-xl" value={card4} onChange={(e) => setCard4(e.target.value.replace(/\D/g, ''))} /></div>
          <div><Label>تاریخ واریز</Label><div className="mt-2"><DatePicker value={date ? new Date(date + 'T12:00:00') : undefined} onChange={(d) => setDate(d ? isoDate(d) : null)} /></div></div>
        </div>
        <Button onClick={submit} disabled={busy || isUploading} className="h-12 rounded-xl text-base font-bold">{busy && <Loader2 className="animate-spin" />}ارسال برای تأیید</Button>
      </DialogContent>
    </Dialog>
  );
}

export function PortalNotifications() {
  const { data, reload } = usePortal();
  useEffect(() => { if (data.notifications.some((n: any) => !n.read)) { const t = setTimeout(() => call({ action: 'markRead' }).then(reload).catch(() => {}), 1500); return () => clearTimeout(t); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">اعلان‌ها</h1>
      {data.notifications.length === 0 ? <Box className="flex flex-col items-center gap-2 py-14 text-sm text-muted-foreground"><BellOff className="h-8 w-8 opacity-40" />اعلانی ندارید</Box> : (
        <div className="space-y-2">{data.notifications.map((n: any) => (
          <Link key={n.id} to="/portal/invoices" className={`block rounded-2xl border p-4 transition-colors ${n.read ? 'border-border bg-card' : 'border-accent bg-accent/10'}`}>
            <div className="flex items-start gap-3">{!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-foreground" />}<div className="flex-1"><p className="font-bold">{n.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{n.body}</p><p className="mt-2 text-xs text-muted-foreground">{jDateTime(n.createdAt)}</p></div></div>
          </Link>
        ))}</div>
      )}
    </div>
  );
}

export function PortalProfile() {
  const { data } = usePortal();
  const c = data.customer;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">پروفایل</h1>
      <Box className="space-y-3 text-sm">
        {[['نام کاربری', c.username], ['نام مشتری', c.name], ['نام رابط', c.contactName], ['ایمیل', c.email], ['تلفن', c.phone], ['شناسه ملی', c.nationalId], ['آدرس', c.address]].map(([l, v]) => (
          <div key={l} className="flex justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"><span className="text-muted-foreground">{l}</span><span className="text-left font-bold">{v || '—'}</span></div>
        ))}
      </Box>
      <ChangePw />
      <p className="text-center text-xs text-muted-foreground">برای تغییر اطلاعات با پشتیبانی پارامیس‌تک تماس بگیرید.</p>
    </div>
  );
}

function ChangePw() {
  const [f, setF] = useState({ cur: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.next !== f.confirm) return toast.error('تکرار رمز جدید یکسان نیست');
    setBusy(true);
    try { await call({ action: 'changePassword', password: f.cur, newPassword: f.next }); toast.success('رمز عبور تغییر کرد'); setF({ cur: '', next: '', confirm: '' }); }
    catch (er: any) { toast.error(er?.userFacingMessage || 'تغییر رمز ناموفق بود'); } finally { setBusy(false); }
  };
  const fld = (k: keyof typeof f, l: string) => <div><Label>{l}</Label><Input type="password" dir="ltr" className="mt-2 h-11 rounded-xl text-right" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></div>;
  return (
    <Box>
      <form onSubmit={submit} className="space-y-3">
        <p className="font-black">تغییر رمز عبور</p>
        {fld('cur', 'رمز فعلی')}{fld('next', 'رمز جدید (حداقل ۸ کاراکتر)')}{fld('confirm', 'تکرار رمز جدید')}
        <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl font-bold">{busy ? <Loader2 className="animate-spin" /> : 'ذخیره رمز جدید'}</Button>
      </form>
    </Box>
  );
}
