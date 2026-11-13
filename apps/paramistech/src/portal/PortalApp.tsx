/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Bell, FileText, Home, Loader2, LogOut, User } from 'lucide-react';
import { call, clearToken, getToken } from './session';
import PortalLogin from './PortalLogin';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { Logo } from '../components/ui-bits';
import { num } from '../lib/format';
import { PortalHome, PortalInvoices, PortalInvoice, PortalNotifications, PortalProfile } from './screens';
import InstallPrompt from './InstallPrompt';

type Data = any;
const Ctx = createContext<{ data: Data; reload: () => Promise<void> } | null>(null);
export const usePortal = () => useContext(Ctx)!;

function Shell({ children }: { children: ReactNode }) {
  const { data } = usePortal();
  const unread = (data.notifications ?? []).filter((n: any) => !n.read).length;
  const tabs = [
    { to: '/portal', icon: Home, label: 'خانه', end: true },
    { to: '/portal/invoices', icon: FileText, label: 'فاکتورها' },
    { to: '/portal/notifications', icon: Bell, label: 'اعلان‌ها', badge: unread },
    { to: '/portal/profile', icon: User, label: 'پروفایل' },
  ];
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Logo className="h-8 w-8" />
          <div className="flex-1"><p className="text-sm font-black leading-4">پرتال مشتریان</p><p className="text-[11px] text-muted-foreground">{data.customer.name}</p></div>
          <nav className="hidden gap-1 md:flex">{tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn('relative rounded-xl px-3 py-2 text-sm font-bold', isActive ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>{t.label}{!!t.badge && <span className="mr-1 rounded-full bg-secondary px-1.5 text-[10px] text-secondary-foreground">{num(t.badge)}</span>}</NavLink>
          ))}</nav>
          <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => { clearToken(); window.location.href = '/portal'; }} aria-label="خروج"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      <nav className="glass fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-2xl p-1.5 shadow-soft md:hidden" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn('relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-bold transition-colors', isActive ? 'bg-foreground text-accent' : 'text-muted-foreground')}>
            <t.icon className="h-5 w-5" />{t.label}
            {!!t.badge && <span className="absolute right-[28%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[9px] text-secondary-foreground">{num(t.badge)}</span>}
          </NavLink>
        ))}
      </nav>
      <InstallPrompt />
    </div>
  );
}

export default function PortalApp() {
  const [authed, setAuthed] = useState(() => !!getToken());
  const [data, setData] = useState<Data | null>(null);
  const reload = useCallback(async () => { setData(await call({ action: 'me' })); }, []);
  useEffect(() => { document.title = 'پرتال مشتریان | پارامیس‌تک'; }, []);
  useEffect(() => { if (authed) reload().catch(() => { clearToken(); setAuthed(false); }); }, [authed, reload]);

  if (!authed) return <PortalLogin onDone={() => setAuthed(true)} />;
  if (!data) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;

  return (
    <Ctx.Provider value={{ data, reload }}>
      <Shell>
        <Routes>
          <Route index element={<PortalHome />} />
          <Route path="invoices" element={<PortalInvoices />} />
          <Route path="invoices/:id" element={<PortalInvoice />} />
          <Route path="notifications" element={<PortalNotifications />} />
          <Route path="profile" element={<PortalProfile />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </Shell>
    </Ctx.Provider>
  );
}
