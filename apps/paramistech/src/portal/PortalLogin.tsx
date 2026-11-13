import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Receipt, ShieldCheck, User, Wallet } from 'lucide-react';
import { portal } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Logo } from '../components/ui-bits';
import { setToken } from './session';

const perks = [
  { icon: Receipt, t: 'فاکتورهای دیجیتال', d: 'همه صورتحساب‌ها در یک‌جا، قابل چاپ' },
  { icon: Wallet, t: 'پرداخت و ارسال رسید', d: 'کارت‌به‌کارت و ثبت رسید در چند ثانیه' },
  { icon: ShieldCheck, t: 'یادآوری سررسید', d: 'قبل از تمام شدن سرویس باخبر شوید' },
];

function Field({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="group flex h-14 items-center gap-3 rounded-2xl border border-border bg-background px-4 transition-all focus-within:border-foreground focus-within:shadow-[0_0_0_4px_hsl(var(--accent)/0.25)]">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-foreground" />
      {children}
    </div>
  );
}

export default function PortalLogin({ onDone }: { onDone: () => void }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await portal({ action: 'login', username: u, password: p });
      setToken(r.token as string); onDone();
    } catch (er: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErr(er?.userFacingMessage || er?.message || 'ورود ناموفق بود.');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand side */}
      <div className="bg-brand relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="bg-dots absolute inset-0 opacity-20" />
        <motion.div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" animate={{ y: [0, 30, 0] }} transition={{ duration: 9, repeat: Infinity }} />
        <motion.div className="absolute -bottom-32 right-10 h-80 w-80 rounded-full bg-accent/30 blur-3xl" animate={{ y: [0, -30, 0] }} transition={{ duration: 11, repeat: Infinity }} />
        <a href="/" className="relative flex items-center gap-3"><Logo dark className="h-10 w-10" /><span className="text-lg font-black">پارامیس‌تک</span></a>
        <div className="relative my-auto max-w-md">
          <p className="text-sm font-bold text-white/70">پرتال مشتریان</p>
          <h2 className="mt-3 text-4xl font-black leading-[1.35]">مدیریت سرویس‌ها، ساده و شفاف.</h2>
          <div className="mt-10 space-y-3">
            {perks.map((x, i) => (
              <motion.div key={x.t} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><x.icon className="h-5 w-5" /></span>
                <div><p className="font-bold">{x.t}</p><p className="text-sm text-white/70">{x.d}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/60">© پارامیس‌تک</p>
      </div>

      {/* Form side */}
      <div className="relative flex items-center justify-center p-6">
        <div className="bg-dots absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] lg:hidden" />
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground shadow-soft lg:hidden"><Logo dark className="h-9 w-9" /></span>
          <h1 className="mt-6 text-3xl font-black lg:mt-0">خوش آمدید</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">با نام کاربری و رمزی که تیم پارامیس‌تک در اختیارتان گذاشته وارد شوید.</p>

          <div className="mt-8 space-y-3">
            <Field icon={User}>
              <input dir="ltr" autoComplete="username" placeholder="نام کاربری" value={u} onChange={(e) => setU(e.target.value)} required
                className="h-full flex-1 bg-transparent text-right text-base outline-none placeholder:text-muted-foreground" />
            </Field>
            <Field icon={Lock}>
              <input dir="ltr" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="رمز عبور" value={p} onChange={(e) => setP(e.target.value)} required
                className="h-full flex-1 bg-transparent text-right text-base outline-none placeholder:text-muted-foreground" />
              <button type="button" onClick={() => setShow(!show)} className="text-muted-foreground hover:text-foreground" aria-label="نمایش رمز">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </Field>
          </div>

          {err && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{err}</motion.p>}

          <Button type="submit" disabled={busy} className="group mt-6 h-14 w-full rounded-2xl text-base font-black">
            {busy ? <Loader2 className="animate-spin" /> : <>ورود به پرتال<ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" /></>}
          </Button>

          <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">حساب کاربری ندارید یا رمز را فراموش کرده‌اید؟<br />با پشتیبانی پارامیس‌تک تماس بگیرید.</p>
          <a href="/" className="mt-4 block text-center text-sm font-bold text-muted-foreground hover:text-foreground">بازگشت به سایت</a>
        </motion.form>
      </div>
    </div>
  );
}
