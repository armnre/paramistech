/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDownUp, ChevronLeft, ChevronRight, Inbox, Loader2, Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from 'zitejs/upload';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { DatePicker } from '@project/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@project/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { cn } from '@project/components/lib/utils';
import { isoDate, num } from '../lib/format';
import { errMsg, useList, type Table } from './session';

/* ---------------- Page header ---------------- */
export function PageHead({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-black tracking-tight md:text-[1.75rem]">{title}</h1>{desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-border bg-card shadow-soft', className)}>{children}</div>;
}

/* ---------------- Data table ---------------- */
export type Col = { key: string; label: string; render?: (r: any) => ReactNode; sortValue?: (r: any) => string | number; className?: string; hideSm?: boolean };

export function DataTable({ rows, cols, searchKeys, onRow, tabs, tabKey, empty = 'موردی یافت نشد', toolbar, pageSize = 12 }: {
  rows: any[] | null; cols: Col[]; searchKeys: string[]; onRow?: (r: any) => void; tabs?: string[]; tabKey?: string; empty?: string; toolbar?: ReactNode; pageSize?: number;
}) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('همه');
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    let r = rows ?? [];
    if (tabs && tabKey && tab !== 'همه') r = r.filter((x) => x[tabKey] === tab);
    if (q.trim()) { const s = q.trim().toLowerCase(); r = r.filter((x) => searchKeys.some((k) => String(x[k] ?? '').toLowerCase().includes(s))); }
    if (sort) { const c = cols.find((x) => x.key === sort.k); const v = (x: any) => (c?.sortValue ? c.sortValue(x) : x[sort.k] ?? ''); r = [...r].sort((a, b) => (v(a) > v(b) ? 1 : v(a) < v(b) ? -1 : 0) * sort.d); }
    return r;
  }, [rows, q, tab, sort, tabs, tabKey, searchKeys, cols]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const count = (t: string) => (t === 'همه' ? rows?.length ?? 0 : (rows ?? []).filter((x) => tabKey && x[tabKey] === t).length);

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <div className="relative min-w-[200px] flex-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="جست‌وجو…" className="h-10 rounded-xl border-0 bg-muted pr-9 shadow-none" /></div>
        {toolbar}
      </div>
      {tabs && (
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 [scrollbar-width:none]">
          {['همه', ...tabs].map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(0); }} className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors', tab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>
              {t} <span className="opacity-60">{num(count(t))}</span>
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
            {cols.map((c) => (
              <th key={c.key} className={cn('whitespace-nowrap px-4 py-3 font-bold', c.hideSm && 'hidden md:table-cell', c.className)}>
                <button onClick={() => setSort((s) => (s?.k === c.key ? { k: c.key, d: s.d === 1 ? -1 : 1 } : { k: c.key, d: 1 }))} className="inline-flex items-center gap-1 hover:text-foreground">{c.label}<ArrowDownUp className={cn('h-3 w-3', sort?.k === c.key ? 'opacity-100' : 'opacity-30')} /></button>
              </th>
            ))}
          </tr></thead>
          <tbody>
            {rows === null ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={cols.length} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>)
              : view.map((r) => (
                <tr key={r.id} onClick={() => onRow?.(r)} className={cn('border-b border-border/70 last:border-0 transition-colors', onRow && 'cursor-pointer hover:bg-muted/50')}>
                  {cols.map((c) => <td key={c.key} className={cn('px-4 py-3 align-middle', c.hideSm && 'hidden md:table-cell', c.className)}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
                </tr>
              ))}
          </tbody>
        </table>
        {rows !== null && !filtered.length && <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground"><Inbox className="h-8 w-8 opacity-40" />{empty}</div>}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>{num(filtered.length)} مورد</span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronRight className="h-4 w-4" /></Button>
            <span className="px-2">{num(page + 1)} از {num(pages)}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Record form dialog ---------------- */
export type Field = { key: string; label: string; type?: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date' | 'link' | 'url' | 'image' | 'password' | 'email'; options?: string[]; table?: Table; labelKey?: string; required?: boolean; full?: boolean; hint?: string; ltr?: boolean };

function LinkSelect({ table, labelKey, value, onChange }: { table: Table; labelKey: string; value?: string; onChange: (v: string) => void }) {
  const { rows } = useList(table);
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue placeholder={rows ? 'انتخاب کنید' : 'در حال بارگذاری…'} /></SelectTrigger>
      <SelectContent>{(rows ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r[labelKey] || '(بدون نام)'}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function ImageField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const { upload, isUploading } = useUpload();
  return (
    <div className="mt-2 flex items-center gap-3">
      {value ? <img src={value} alt="" className="h-16 w-24 rounded-xl object-cover ring-1 ring-border" /> : <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">بدون تصویر</div>}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold hover:bg-muted">
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}آپلود
        <input type="file" accept="image/*" hidden disabled={isUploading} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { onChange((await upload(f)).url); } catch { toast.error('آپلود ناموفق بود'); } }} />
      </label>
      {value && <Button type="button" size="icon" variant="ghost" onClick={() => onChange('')}><X className="h-4 w-4" /></Button>}
    </div>
  );
}

export function FieldInput({ f, value, onChange }: { f: Field; value: any; onChange: (v: any) => void }) {
  const cls = 'mt-2 h-11 rounded-xl';
  switch (f.type) {
    case 'textarea': return <Textarea rows={4} className="mt-2 rounded-xl" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'number': return <Input type="number" dir="ltr" className={`${cls} text-right`} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'checkbox': return <div className="mt-3"><Switch checked={!!value} onCheckedChange={onChange} /></div>;
    case 'date': return <div className="mt-2"><DatePicker value={value ? new Date(value + 'T12:00:00') : undefined} onChange={(d) => onChange(d ? isoDate(d) : null)} /></div>;
    case 'select': return (
      <Select value={value || undefined} onValueChange={onChange}><SelectTrigger className={cls}><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
        <SelectContent>{f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>);
    case 'link': return <LinkSelect table={f.table!} labelKey={f.labelKey ?? 'name'} value={Array.isArray(value) ? value[0] : value} onChange={onChange} />;
    case 'image': return <ImageField value={value} onChange={onChange} />;
    default: return <Input type={f.type === 'password' ? 'password' : f.type === 'email' ? 'email' : 'text'} dir={f.ltr || f.type === 'url' || f.type === 'email' ? 'ltr' : undefined} className={cn(cls, (f.ltr || f.type === 'url' || f.type === 'email') && 'text-right')} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function RecordDialog({ open, onOpenChange, title, fields, initial, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; fields: Field[]; initial: Record<string, any>; onSubmit: (d: Record<string, any>) => Promise<void> }) {
  const [d, setD] = useState<Record<string, any>>(initial);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [lastInit, setLastInit] = useState(initial);
  if (initial !== lastInit) { setLastInit(initial); setD(initial); setErrs({}); }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = Object.fromEntries(fields.filter((f) => f.required && (d[f.key] === undefined || d[f.key] === null || d[f.key] === '')).map((f) => [f.key, 'این فیلد الزامی است']));
    setErrs(missing);
    if (Object.keys(missing).length) return;
    setBusy(true);
    try { await onSubmit(d); onOpenChange(false); toast.success('ذخیره شد'); } catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl" dir="rtl">
        <DialogHeader><DialogTitle className="text-right text-xl font-black">{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={cn((f.full || f.type === 'textarea' || f.type === 'image') && 'sm:col-span-2')}>
                <Label className="text-xs font-bold">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                <FieldInput f={f} value={d[f.key]} onChange={(v) => setD((x) => ({ ...x, [f.key]: v }))} />
                {errs[f.key] ? <p className="mt-1 text-xs text-destructive">{errs[f.key]}</p> : f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={busy} className="h-11 rounded-xl px-6 font-bold">{busy && <Loader2 className="animate-spin" />}ذخیره</Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => onOpenChange(false)}>انصراف</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDelete({ open, onOpenChange, onConfirm, what }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void; what: string }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="rounded-3xl">
        <AlertDialogHeader className="text-right"><AlertDialogTitle>حذف {what}؟</AlertDialogTitle><AlertDialogDescription>این کار قابل بازگشت نیست.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start"><AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction><AlertDialogCancel>انصراف</AlertDialogCancel></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
