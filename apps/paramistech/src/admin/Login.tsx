import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { adminAuth } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Button } from '@project/components/ui/button';
import { Logo, ease } from '../components/ui-bits';
import { errMsg, type Admin } from './session';

export default function Login({ onAuth }: { onAuth: (t: string, a: Admin) => void }) {
  const [setup, setSetup] = useState<boolean | null>(null);
  const [f, setF] = useState({ username: '', password: '', displayName: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminAuth({ action: 'status' }).then((r) => setSetup(!r.hasAdmins)).catch(() => setSetup(false)); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (setup && f.password !== f.confirm) return setErr('تکرار رمز با رمز یکسان نیست.');
    setBusy(true);
    try {
      const r = await adminAuth({ action: setup ? 'setup' : 'login', username: f.username, password: f.password, displayName: f.displayName });
      if (r.token && r.admin) onAuth(r.token, r.admin);
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-brand relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-dots absolute inset-0 opacity-30" />
        <div className="relative flex items-center gap-3"><Logo dark className="h-10 w-10" /><span className="text-xl font-black">پارامیس‌تک</span></div>
        <div className="relative">
          <p className="font-serif-en text-2xl text-white/60" dir="ltr">Control room</p>
          <h1 className="mt-3 text-5xl font-black leading-[1.3]">همه‌چیز،<br />در یک پنل.</h1>
          <p className="mt-4 max-w-sm leading-8 text-white/70">مشتریان، سرویس‌ها، فاکتورها، پرداخت‌ها و محتوای سایت را از اینجا مدیریت کنید.</p>
        </div>
        <p className="relative text-xs text-white/50">دسترسی فقط برای مدیران مجاز</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} onSubmit={submit} className="w-full max-w-sm space-y-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-accent">{setup ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}</span>
          <div>
            <h2 className="text-2xl font-black">{setup ? 'ساخت حساب مدیر اصلی' : 'ورود به پنل مدیریت'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{setup ? 'اولین بار است؛ نام‌کاربری و رمز دلخواه خود را تعیین کنید.' : 'نام‌کاربری و رمز عبور خود را وارد کنید.'}</p>
          </div>
          {setup === null ? <Loader2 className="h-6 w-6 animate-spin" /> : <>
            {setup && <div><Label>نام نمایشی</Label><Input className="mt-2 h-12 rounded-xl" value={f.displayName} onChange={set('displayName')} /></div>}
            <div><Label>نام‌کاربری</Label><Input dir="ltr" autoComplete="username" className="mt-2 h-12 rounded-xl text-right" value={f.username} onChange={set('username')} required /></div>
            <div><Label>رمز عبور</Label><Input dir="ltr" type="password" autoComplete={setup ? 'new-password' : 'current-password'} className="mt-2 h-12 rounded-xl text-right" value={f.password} onChange={set('password')} required /></div>
            {setup && <div><Label>تکرار رمز عبور</Label><Input dir="ltr" type="password" className="mt-2 h-12 rounded-xl text-right" value={f.confirm} onChange={set('confirm')} required /></div>}
            {err && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base font-bold">{busy && <Loader2 className="animate-spin" />}{setup ? 'ساخت حساب و ورود' : 'ورود'}</Button>
          </>}
          <a href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">بازگشت به سایت</a>
        </motion.form>
      </div>
    </div>
  );
}
