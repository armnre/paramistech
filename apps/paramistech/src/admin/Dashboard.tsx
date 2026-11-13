/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpLeft, Building2, Clock, Inbox, Loader2, Receipt, RefreshCw, Server, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { daysUntil, jDate, jDateTime, num, toman } from '../lib/format';
import { PageHead, Panel } from './kit';
import { errMsg, useAdmin, useApi } from './session';

const fmtMonth = (m: string) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'short' }).format(new Date(m + '-15'));

function Kpi({ icon: I, label, value, sub, to, tone }: { icon: typeof Clock; label: string; value: string; sub?: string; to?: string; tone?: string }) {
  const body = (
    <Panel className="group h-full p-5 transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone ?? 'bg-foreground text-accent'}`}><I className="h-5 w-5" /></span>{to && <ArrowUpLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />}</div>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Panel>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function Dashboard() {
  const api = useApi();
  const { admin, can } = useAdmin();
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api.finance({ action: 'dashboard' }).then(setD).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const runBilling = async () => {
    setBusy(true);
    try { const r = await api.finance({ action: 'runBilling' }); toast.success(`${num(r.issued)} فاکتور صادر شد، ${num(r.overdue)} فاکتور معوق شد`); load(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const hour = new Date().getHours();

  return (
    <>
      <PageHead title={`${hour < 12 ? 'صبح بخیر' : hour < 18 ? 'روز بخیر' : 'عصر بخیر'}، ${admin.name}`} desc={jDate(new Date().toISOString(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={can('finance') && <Button onClick={runBilling} disabled={busy} className="h-10 rounded-xl font-bold">{busy ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}اجرای صدور فاکتور سررسیدها</Button>} />
      {!d ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={TrendingUp} label="درآمد این ماه" value={toman(d.monthRevenue)} />
          <Kpi icon={Clock} label="مطالبات باز" value={toman(d.outstanding)} sub={`${num(d.open)} فاکتور باز`} to="/admin/invoices" />
          <Kpi icon={Receipt} label="رسیدهای در انتظار تأیید" value={num(d.pendingPayments)} to="/admin/payments" tone={d.pendingPayments ? 'bg-secondary text-secondary-foreground' : undefined} />
          <Kpi icon={AlertTriangle} label="فاکتورهای معوق" value={num(d.overdue)} to="/admin/invoices" tone={d.overdue ? 'bg-destructive text-destructive-foreground' : undefined} />
          <Kpi icon={Building2} label="مشتریان فعال" value={num(d.customers)} to="/admin/customers" />
          <Kpi icon={Server} label="سرویس‌های فعال" value={num(d.activeServices)} to="/admin/services" />
          <Kpi icon={Inbox} label="درخواست‌های جدید پروژه" value={num(d.newRequests)} to="/admin/requests" />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Panel className="p-5">
            <p className="font-black">درآمد ۱۲ ماه اخیر</p><p className="text-xs text-muted-foreground">فاکتورهای پرداخت‌شده</p>
            <div className="mt-4 h-64" dir="ltr">
              {d.revenue.length ? (
                <ResponsiveContainer><AreaChart data={d.revenue.map((r: any) => ({ m: fmtMonth(r.m), v: r.v }))}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.6} /><stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} reversed />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={60} orientation="right" tickFormatter={(v) => (v / 1e6).toLocaleString('fa-IR') + 'م'} />
                  <Tooltip formatter={(v: number) => toman(v)} contentStyle={{ borderRadius: 12, direction: 'rtl', fontFamily: 'inherit' }} />
                  <Area type="monotone" dataKey="v" stroke="hsl(var(--foreground))" strokeWidth={2} fill="url(#g)" />
                </AreaChart></ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground" dir="rtl">هنوز پرداختی ثبت نشده است</div>}
            </div>
          </Panel>
          <Panel className="p-5">
            <div className="flex items-center justify-between"><p className="font-black">سررسیدهای ۳۰ روز آینده</p><Link to="/admin/services" className="text-xs font-bold text-muted-foreground hover:text-foreground">همه</Link></div>
            <div className="mt-3 divide-y divide-border">
              {d.upcoming.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">سررسید نزدیکی ندارید</p>}
              {d.upcoming.map((s: any) => { const n = daysUntil(s.nextDueDate) ?? 0; return (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <span className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-black ${n < 0 ? 'bg-destructive/10 text-destructive' : n <= 3 ? 'bg-secondary/30' : 'bg-muted'}`}>{num(Math.abs(n))}<span className="text-[9px] font-medium">{n < 0 ? 'روز گذشته' : 'روز'}</span></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{s.title}</p><p className="truncate text-xs text-muted-foreground">{s.customer ?? '—'} · {jDate(s.nextDueDate)}</p></div>
                  <span className="text-xs font-bold tabular-nums">{num(s.amount)}</span>
                </div>); })}
            </div>
          </Panel>
        </div>

        <Panel className="mt-4 p-5">
          <p className="font-black">آخرین فعالیت‌ها</p>
          <div className="mt-3 grid gap-x-8 md:grid-cols-2">
            {d.activity.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 border-b border-border/60 py-2.5 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent ring-4 ring-accent/20" />
                <span className="flex-1 truncate"><b>{a.actor}</b> — {a.action} {a.details && <span className="text-muted-foreground">({a.details})</span>}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{jDateTime(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </>}
    </>
  );
}
