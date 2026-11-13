import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, MapPin, Clock } from 'lucide-react';
import { submitRequest } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { budgets, fa, projectTypes, timelines } from '../data';
import { useContent } from '../content';
import { IconTile, SectionHead, sectionCls } from './ui-bits';

const step1 = z.object({
  fullName: z.string().trim().min(2, 'نام را وارد کنید'),
  phone: z.string().trim().regex(/^[0-9۰-۹+\s-]{8,20}$/, 'شماره تماس معتبر نیست'),
  email: z.string().trim().email('ایمیل معتبر نیست').or(z.literal('')),
});
const step2 = z.object({ details: z.string().trim().min(10, 'حداقل ۱۰ کاراکتر درباره پروژه بنویسید') });
const empty = { fullName: '', phone: '', email: '', company: '', details: '', website: '' };

function Chips<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return <div className="flex flex-wrap gap-2">{items.map((i) => (
    <button type="button" key={i} onClick={() => onChange(i)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ${value === i ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-muted-foreground hover:border-foreground/40'}`}>{i}</button>
  ))}</div>;
}


export default function Contact() {
  const { settings } = useContent();
  const info = [{ i: Clock, t: 'پاسخ‌گویی', v: 'کمتر از یک روز کاری' }, { i: Mail, t: 'ایمیل', v: settings['contact.email'] || 'info@paramistech.ir' }, { i: MapPin, t: 'همکاری', v: settings['contact.note'] || 'حضوری و ریموت در سراسر ایران' }];
  const [f, setF] = useState(empty);
  const [type, setType] = useState<(typeof projectTypes)[number]>('وب‌سایت');
  const [budget, setBudget] = useState<(typeof budgets)[number]>('هنوز مشخص نیست');
  const [timeline, setTimeline] = useState<(typeof timelines)[number]>('۱ تا ۳ ماه');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const check = (s: z.ZodTypeAny) => {
    const r = s.safeParse(f);
    setErrors(r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    return r.success;
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 0) { if (check(step1)) setStep(1); return; }
    if (!check(step2)) return;
    setBusy(true);
    try { await submitRequest({ ...f, projectType: type, budget, timeline }); setDone(true); }
    catch { toast.error('ارسال ناموفق بود. لطفاً دوباره تلاش کنید.'); } finally { setBusy(false); }
  };
  const err = (k: string) => errors[k] && <p className="mt-1.5 text-xs text-destructive">{errors[k]}</p>;
  const inp = 'mt-2 h-12 rounded-2xl bg-background';

  return (
    <section id="contact" className={sectionCls}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHead center={false} kicker="شروع همکاری" en="Let's talk" title={<>درخواست پروژه‌تان را <span className="text-gradient">ثبت کنید</span></>} desc="فرم را پر کنید؛ ظرف یک روز کاری برای جلسه مشاوره رایگان با شما تماس می‌گیریم." />
          <div className="space-y-3">
            {info.map((c) => (
              <div key={c.t} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
                <IconTile icon={c.i} className="h-11 w-11" />
                <div><p className="text-xs text-muted-foreground">{c.t}</p><p className="font-bold">{c.v}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-10">
          {done ? (
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-16 text-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-foreground"><CheckCircle2 className="h-10 w-10" /></motion.span>
              <h3 className="mt-6 text-2xl font-black">درخواست شما ثبت شد!</h3>
              <p className="mt-2 leading-8 text-muted-foreground">به‌زودی برای هماهنگی جلسه مشاوره با شما تماس می‌گیریم.</p>
              <Button variant="outline" className="mt-8 rounded-full" onClick={() => { setDone(false); setStep(0); setF(empty); }}>ثبت درخواست جدید</Button>
            </motion.div>
          ) : (
            <form onSubmit={submit} noValidate>
              <input className="hidden" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
              <div className="mb-8 flex items-center gap-3">
                {['اطلاعات تماس', 'جزئیات پروژه'].map((l, k) => (
                  <div key={l} className="flex flex-1 items-center gap-2">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black transition-colors ${step >= k ? 'bg-foreground text-accent' : 'bg-muted text-muted-foreground'}`}>{fa(k + 1)}</span>
                    <span className={`text-sm font-bold ${step >= k ? '' : 'text-muted-foreground'}`}>{l}</span>
                    {k === 0 && <span className="h-px flex-1 bg-border" />}
                  </div>
                ))}
              </div>
              <AnimatePresence mode="wait">
                {step === 0 ? (
                  <motion.div key="s0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid gap-5 sm:grid-cols-2">
                    <div><Label>نام و نام خانوادگی *</Label><Input className={inp} value={f.fullName} onChange={set('fullName')} />{err('fullName')}</div>
                    <div><Label>شماره تماس *</Label><Input dir="ltr" className={`${inp} text-right`} value={f.phone} onChange={set('phone')} placeholder="09xx xxx xxxx" />{err('phone')}</div>
                    <div><Label>ایمیل</Label><Input dir="ltr" className={`${inp} text-right`} value={f.email} onChange={set('email')} />{err('email')}</div>
                    <div><Label>شرکت / برند</Label><Input className={inp} value={f.company} onChange={set('company')} /></div>
                  </motion.div>
                ) : (
                  <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                    <div><Label>نوع پروژه</Label><div className="mt-3"><Chips items={projectTypes} value={type} onChange={(v) => setType(v as typeof type)} /></div></div>
                    <div><Label>بودجه</Label><div className="mt-3"><Chips items={budgets} value={budget} onChange={(v) => setBudget(v as typeof budget)} /></div></div>
                    <div><Label>زمان‌بندی</Label><div className="mt-3"><Chips items={timelines} value={timeline} onChange={(v) => setTimeline(v as typeof timeline)} /></div></div>
                    <div><Label>درباره پروژه *</Label><Textarea rows={5} className="mt-2 rounded-2xl bg-background" value={f.details} onChange={set('details')} placeholder="ایده، اهداف و امکانات مورد نیاز را بنویسید..." />{err('details')}</div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-8 flex gap-3">
                {step === 1 && <Button type="button" variant="outline" onClick={() => setStep(0)} className="h-12 rounded-full px-5"><ArrowRight className="h-4 w-4" /> قبلی</Button>}
                <Button type="submit" disabled={busy} className="h-12 flex-1 rounded-full text-base font-bold">
                  {busy ? <Loader2 className="animate-spin" /> : null}{step === 0 ? 'مرحله بعد' : 'ارسال درخواست'}{!busy && <ArrowLeft className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
