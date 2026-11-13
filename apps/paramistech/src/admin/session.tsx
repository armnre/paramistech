import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { adminAuth, adminCrud, adminFinance, type AdminCrudInputType, type AdminFinanceInputType } from 'zitejs/api';

export type Admin = { id: string; username: string; name: string; role: string };
type Ctx = { admin: Admin; token: string; logout: () => void; can: (area: Area) => boolean };
export type Area = 'finance' | 'content' | 'requests' | 'system';
const KEY = 'pt-admin-token';
const AdminCtx = createContext<Ctx | null>(null);
export const useAdmin = () => useContext(AdminCtx)!;

const access: Record<string, Area[]> = { 'مدیر کل': ['finance', 'content', 'requests', 'system'], 'مالی': ['finance', 'requests'], 'محتوا': ['content', 'requests'] };

export function AdminSession({ children, fallback }: { children: ReactNode; fallback: (onAuth: (token: string, a: Admin) => void) => ReactNode }) {
  const [state, setState] = useState<{ token: string; admin: Admin } | null | 'loading'>('loading');
  useEffect(() => {
    const t = localStorage.getItem(KEY);
    if (!t) return setState(null);
    adminAuth({ action: 'me', token: t }).then((r) => setState(r.admin ? { token: t, admin: r.admin } : null)).catch(() => { localStorage.removeItem(KEY); setState(null); });
  }, []);
  const onAuth = useCallback((token: string, admin: Admin) => { localStorage.setItem(KEY, token); setState({ token, admin }); }, []);
  const logout = useCallback(() => { localStorage.removeItem(KEY); setState(null); }, []);
  if (state === 'loading') return <div className="flex min-h-screen items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>;
  if (!state) return <>{fallback(onAuth)}</>;
  return <AdminCtx.Provider value={{ ...state, logout, can: (a) => (access[state.admin.role] ?? []).includes(a) }}>{children}</AdminCtx.Provider>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Table = AdminCrudInputType['table'];
export function useApi() {
  const { token, logout } = useAdmin();
  const wrap = async <T,>(p: Promise<T>): Promise<T> => {
    try { return await p; } catch (e: any) { if (String(e?.code ?? e?.message).includes('UNAUTHORIZED')) logout(); throw e; }
  };
  return {
    list: (table: Table, filters?: Record<string, unknown>) => wrap(adminCrud({ token, table, action: 'list', filters })).then((r) => r.records as any[]),
    get: (table: Table, id: string) => wrap(adminCrud({ token, table, action: 'get', id })).then((r) => r.record as any),
    save: (table: Table, data: Record<string, unknown>, id?: string) => wrap(adminCrud({ token, table, action: 'save', id, data })).then((r) => r.record as any),
    remove: (table: Table, id: string) => wrap(adminCrud({ token, table, action: 'delete', id })),
    finance: (p: Omit<AdminFinanceInputType, 'token'>) => wrap(adminFinance({ ...p, token })) as Promise<any>,
  };
}

/** Small data hook: loads a list and exposes reload. */
export function useList(table: Table, filters?: Record<string, unknown>) {
  const api = useApi();
  const [rows, setRows] = useState<any[] | null>(null);
  const key = JSON.stringify(filters ?? {});
  const reload = useCallback(() => api.list(table, filters).then(setRows).catch(() => setRows([])), [table, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { rows, setRows, reload };
}
export const errMsg = (e: any) => e?.userFacingMessage || e?.message || 'خطایی رخ داد';
