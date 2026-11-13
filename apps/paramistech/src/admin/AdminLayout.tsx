import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, Building2, CreditCard, ExternalLink, FileText, Globe, Inbox, KeyRound, LayoutDashboard, LogOut, Menu, Receipt, ScrollText, Server, Settings2, Shield, Wallet } from 'lucide-react';
import { Sheet, SheetContent } from '@project/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { Logo } from '../components/ui-bits';
import { jDateTime, num } from '../lib/format';
import { useAdmin, useApi, type Area } from './session';
import ChangePassword from './ChangePassword';

type Item = { to: string; label: string; icon: typeof Bell; area?: Area; badge?: 'payments' | 'requests' };
const groups: { title: string; items: Item[] }[] = [
  { title: '', items: [{ to: '/admin', label: 'داشبورد', icon: LayoutDashboard }] },
  { title: 'مالی', items: [
    { to: '/admin/invoices', label: 'فاکتورها', icon: FileText, area: 'finance' },
    { to: '/admin/payments', label: 'رسیدها و پرداخت‌ها', icon: Receipt, area: 'finance', badge: 'payments' },
    { to: '/admin/banks', label: 'حساب‌های بانکی', icon: Wallet, area: 'finance' },
  ] },
  { title: 'مشتریان', items: [
    { to: '/admin/customers', label: 'مشتریان', icon: Building2, area: 'finance' },
    { to: '/admin/services', label: 'سرویس‌ها و هاست', icon: Server, area: 'finance' },
  ] },
  { title: 'فروش', items: [{ to: '/admin/requests', label: 'درخواست‌های پروژه', icon: Inbox, area: 'requests', badge: 'requests' }] },
  { title: 'محتوای سایت', items: [
    { to: '/admin/content', label: 'مدیریت محتوا', icon: Globe, area: 'content' },
    { to: '/admin/site', label: 'تنظیمات سایت', icon: Settings2, area: 'content' },
  ] },
  { title: 'سیستم', items: [
    { to: '/admin/admins', label: 'مدیران و نقش‌ها', icon: Shield, area: 'system' },
    { to: '/admin/company', label: 'اطلاعات صورتحساب', icon: CreditCard, area: 'system' },
    { to: '/admin/activity', label: 'لاگ فعالیت‌ها', icon: ScrollText, area: 'system' },
  ] },
];

function Sidebar({ counts, onNav }: { counts: Record<string, number>; onNav?: () => void }) {
  const { can } = useAdmin();
  return (
    <div className="flex h-full flex-col bg-foreground text-background">
      <div className="flex items-center gap-2.5 px-5 py-5"><Logo dark className="h-9 w-9" /><div><p className="font-black leading-5">پارامیس‌تک</p><p className="text-[11px] text-background/45">پنل مدیریت</p></div></div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 [scrollbar-width:thin]">
        {groups.map((g) => {
          const items = g.items.filter((i) => !i.area || can(i.area));
          if (!items.length) return null;
          return (
            <div key={g.title}>
              {g.title && <p className="mb-1.5 px-3 text-[11px] font-bold text-background/35">{g.title}</p>}
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === '/admin'} onClick={onNav}
                  className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', isActive ? 'bg-accent text-accent-foreground' : 'text-background/70 hover:bg-background/5 hover:text-background')}>
                  <i.icon className="h-[18px] w-[18px]" /><span className="flex-1">{i.label}</span>
                  {i.badge && counts[i.badge] > 0 && <span className="rounded-full bg-secondary px-2 text-[11px] font-black text-secondary-foreground">{num(counts[i.badge])}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Notifs() {
  const api = useApi();
  const [rows, setRows] = useState<any[]>([]);
  const load = () => api.list('notifications', { audience: 'ادمین' }).then((r) => setRows(r.slice(0, 30))).catch(() => {});
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const unread = rows.filter((r) => !r.read);
  const markAll = async () => { setRows((r) => r.map((x) => ({ ...x, read: true }))); await Promise.all(unread.map((n) => api.save('notifications', { read: true }, n.id))); };
  return (
    <Popover onOpenChange={(o) => o && load()}>
      <PopoverTrigger asChild><Button size="icon" variant="ghost" className="relative rounded-xl"><Bell className="h-5 w-5" />{unread.length > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-background" />}</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0" dir="rtl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="font-black">اعلان‌ها</p>{unread.length > 0 && <button onClick={markAll} className="text-xs font-bold text-muted-foreground hover:text-foreground">خواندن همه</button>}</div>
        <div className="max-h-96 overflow-y-auto">
          {rows.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">اعلانی ندارید</p> : rows.map((n) => (
            <a key={n.id} href={n.link || '#'} className={cn('block border-b border-border/60 px-4 py-3 last:border-0 hover:bg-muted', !n.read && 'bg-accent/10')}>
              <p className="text-sm font-bold">{n.title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{n.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{jDateTime(n.createdAt)}</p>
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAdmin();
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const loc = useLocation();
  useEffect(() => { api.finance({ action: 'dashboard' }).then((d) => setCounts({ payments: d.pendingPayments ?? 0, requests: d.newRequests ?? 0 })).catch(() => {}); }, [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.title = 'پنل مدیریت | پارامیس‌تک'; }, []);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block"><Sidebar counts={counts} /></aside>
      <Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" className="w-[280px] border-0 p-0"><Sidebar counts={counts} onNav={() => setOpen(false)} /></SheetContent></Sheet>
      <div className="min-w-0">
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-2 border-x-0 border-t-0 px-4 md:px-8">
          <Button size="icon" variant="ghost" className="rounded-xl lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="flex-1" />
          <Button asChild variant="ghost" className="hidden rounded-xl sm:inline-flex"><a href="/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />مشاهده سایت</a></Button>
          <Notifs />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-black text-accent">{admin.name[0]?.toUpperCase()}</span>
              <span className="hidden text-right sm:block"><span className="block text-sm font-bold leading-4">{admin.name}</span><span className="text-[11px] text-muted-foreground">{admin.role}</span></span>
            </button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl text-right">
              <DropdownMenuItem onClick={() => setPw(true)}><KeyRound className="h-4 w-4" />تغییر رمز عبور</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive"><LogOut className="h-4 w-4" />خروج</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8"><Outlet /></main>
      </div>
      <ChangePassword open={pw} onOpenChange={setPw} />
    </div>
  );
}
