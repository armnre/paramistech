/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, Loader2, Plus, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { StatusBadge } from '../components/StatusBadge';
import { daysUntil, first, isoDate, jDate, num, toman, type InvoiceItem } from '../lib/format';
import { ConfirmDelete, DataTable, FieldInput, PageHead } from './kit';
import { errMsg, useApi, useList } from './session';

const statuses = ['صادرشده', 'در انتظار تأیید', 'معوق', 'پرداخت‌شده', 'پیش‌نویس', 'لغو'];

function useCompany() {
  const { rows } = useList('siteSettings');
  return useMemo(() => Object.fromEntries((rows ?? []).filter((s) => s.key?.startsWith('company.')).map((s) => [s.key.slice(8), s.value ?? ''])), [rows]);
}

export default function Invoices() {
  const api = useApi();
  const { rows, reload } = useList('invoices');
  const { rows: customers } = useList('customers');
  const { rows: banks } = useList('bankAccounts', { active: true });
  const company = useCompany();
  const cmap = useMemo(() => Object.fromEntries((customers ?? []).map((c) => [c.id, c])), [customers]);
  const [sel, setSel] = useState<any>(null);
  const [create, setCreate] = useState(false);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState('');
  const data = useMemo(() => rows?.map((r) => ({ ...r, customerName: cmap[first(r.customer) ?? '']?.name ?? '—' })) ?? null, [rows, cmap]);

  const act = async (action: 'markPaid' | 'cancelInvoice') => {
    setBusy(action);
    try { await api.finance({ action, id: sel.id }); toast.success(action === 'markPaid' ? 'فاکتور پرداخت‌شده ثبت شد' : 'فاکتور لغو شد'); await reload(); setSel(null); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };

  return (
    <>
      <PageHead title="فاکتورها" desc="همه صورتحساب‌های صادرشده برای مشتریان" actions={<Button className="h-10 rounded-xl font-bold" onClick={() => setCreate(true)}><Plus className="h-4 w-4" />فاکتور جدید</Button>} />
      <DataTable rows={data} tabs={statuses} tabKey="status" searchKeys={['number', 'customerName', 'periodLabel']} onRow={setSel} cols={[
        { key: 'number', label: 'شماره', render: (r) => <span className="font-black" dir="ltr">{r.number}</span> },
        { key: 'customerName', label: 'مشتری', render: (r) => <span className="font-semibold">{r.customerName}</span> },
        { key: 'periodLabel', label: 'شرح', hideSm: true, render: (r) => <span className="text-muted-foreground">{r.periodLabel || '—'}</span> },
        { key: 'total', label: 'مبلغ', render: (r) => <span className="font-bold tabular-nums">{toman(r.total)}</span> },
        { key: 'dueDate', label: 'سررسید', hideSm: true, render: (r) => { const n = daysUntil(r.dueDate); return <span>{jDate(r.dueDate)}{n !== null && n < 0 && r.status !== 'پرداخت‌شده' && r.status !== 'لغو' && <span className="mr-1 text-xs text-destructive">({num(-n)} روز تأخیر)</span>}</span>; } },
        { key: 'status', label: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> },
      ]} />

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent dir="rtl" className="max-h-[94vh] max-w-3xl overflow-y-auto rounded-3xl bg-muted p-3 sm:p-5">
          {sel && <>
            <div className="flex flex-wrap gap-2 pt-6 print:hidden">
              <Button variant="outline" className="rounded-xl bg-card" onClick={() => window.print()}><Printer className="h-4 w-4" />چاپ / PDF</Button>
              {!['پرداخت‌شده', 'لغو'].includes(sel.status) && <Button className="rounded-xl" disabled={!!busy} onClick={() => act('markPaid')}>{busy === 'markPaid' ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}ثبت پرداخت</Button>}
              {!['پرداخت‌شده', 'لغو'].includes(sel.status) && <Button variant="outline" className="rounded-xl bg-card" disabled={!!busy} onClick={() => act('cancelInvoice')}><Ban className="h-4 w-4" />لغو فاکتور</Button>}
              <Button variant="ghost" className="mr-auto rounded-xl text-destructive" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" />حذف</Button>
            </div>
            <InvoiceDocument inv={sel} customer={cmap[first(sel.customer) ?? '']} company={company} banks={banks ?? []} />
          </>}
        </DialogContent>
      </Dialog>
      <ConfirmDelete open={del} onOpenChange={setDel} what="فاکتور" onConfirm={async () => { try { await api.remove('invoices', sel.id); toast.success('حذف شد'); setSel(null); reload(); } catch (e) { toast.error(errMsg(e)); } }} />
      <NewInvoice open={create} onOpenChange={setCreate} onDone={reload} />
    </>
  );
}

function NewInvoice({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const api = useApi();
  const [customer, setCustomer] = useState<string>();
  const [due, setDue] = useState<string | null>(isoDate(new Date(Date.now() + 7 * 864e5)));
  const [items, setItems] = useState<InvoiceItem[]>([{ title: '', qty: 1, price: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const total = items.reduce((a, b) => a + b.qty * b.price, 0) - discount;
  const upd = (i: number, k: keyof InvoiceItem, v: string | number) => setItems((x) => x.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const submit = async () => {
    if (!customer || !due || items.some((i) => !i.title.trim())) return toast.error('مشتری، سررسید و شرح همه اقلام الزامی است');
    setBusy(true);
    try { const r = await api.finance({ action: 'createInvoice', invoice: { customer, dueDate: due, items, discount, notes } }); toast.success(`فاکتور ${r.number} صادر و برای مشتری اعلان شد`); onOpenChange(false); setItems([{ title: '', qty: 1, price: 0 }]); setDiscount(0); setNotes(''); onDone(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle className="text-right text-xl font-black">صدور فاکتور جدید</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label className="text-xs font-bold">مشتری *</Label><FieldInput f={{ key: 'c', label: '', type: 'link', table: 'customers' }} value={customer} onChange={setCustomer} /></div>
          <div><Label className="text-xs font-bold">مهلت پرداخت *</Label><FieldInput f={{ key: 'd', label: '', type: 'date' }} value={due} onChange={setDue} /></div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold">اقلام</Label>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_130px_36px] gap-2">
              <Input placeholder="شرح خدمت" className="h-10 rounded-xl" value={it.title} onChange={(e) => upd(i, 'title', e.target.value)} />
              <Input type="number" dir="ltr" className="h-10 rounded-xl" value={it.qty} onChange={(e) => upd(i, 'qty', Number(e.target.value) || 0)} />
              <Input type="number" dir="ltr" placeholder="مبلغ (تومان)" className="h-10 rounded-xl" value={it.price || ''} onChange={(e) => upd(i, 'price', Number(e.target.value) || 0)} />
              <Button size="icon" variant="ghost" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setItems([...items, { title: '', qty: 1, price: 0 }])}><Plus className="h-4 w-4" />افزودن ردیف</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label className="text-xs font-bold">تخفیف (تومان)</Label><Input type="number" dir="ltr" className="mt-2 h-11 rounded-xl" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} /></div>
          <div className="flex flex-col justify-end rounded-2xl bg-foreground p-4 text-background"><span className="text-xs text-background/60">مبلغ نهایی</span><span className="text-xl font-black">{toman(Math.max(0, total))}</span></div>
        </div>
        <div><Label className="text-xs font-bold">یادداشت روی فاکتور</Label><Textarea rows={2} className="mt-2 rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <Button onClick={submit} disabled={busy} className="h-11 rounded-xl font-bold">{busy && <Loader2 className="animate-spin" />}صدور و ارسال اعلان به مشتری</Button>
      </DialogContent>
    </Dialog>
  );
}
