import { motion } from 'framer-motion';
import { ArrowLeft, Instagram, Linkedin, Send } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { nav, scrollTo } from '../data';
import { useContent } from '../content';
import { Logo, ease } from './ui-bits';

export function Cta() {
  return (
    <section className="container mx-auto max-w-6xl px-5">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease }}
        className="bg-brand relative overflow-hidden rounded-3xl px-6 py-16 md:rounded-[2.5rem] text-center text-white md:py-24">
        <div className="bg-dots absolute inset-0 opacity-30" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="relative">
          <p className="font-serif-en text-xl text-white/70" dir="ltr">Got an idea?</p>
          <h2 className="mt-3 text-[clamp(2rem,5.5vw,4rem)] font-black leading-[1.25]">بیایید با هم بسازیمش.</h2>
          <p className="mx-auto mt-4 max-w-lg leading-8 text-white/80">جلسه اول مشاوره رایگان است؛ فقط کافیست درخواست‌تان را ثبت کنید.</p>
          <Button size="lg" onClick={() => scrollTo('contact')} className="group mt-9 h-[52px] rounded-full bg-white py-3.5 pl-2 pr-6 text-base font-bold text-foreground hover:bg-white/90">
            رزرو مشاوره رایگان
            <span className="mr-1 flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-500 group-hover:-rotate-45"><ArrowLeft className="h-4 w-4" /></span>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

const socials = [{ i: Instagram, l: 'اینستاگرام', k: 'social.instagram' }, { i: Linkedin, l: 'لینکدین', k: 'social.linkedin' }, { i: Send, l: 'تلگرام', k: 'social.telegram' }];

export function Footer() {
  const { settings } = useContent();
  const email = settings['contact.email'] || 'info@paramistech.ir';
  const live = socials.filter((s) => settings[s.k]);
  return (
    <footer className="mt-20 overflow-hidden md:mt-28 bg-foreground text-background">
      <div className="container mx-auto grid max-w-6xl gap-10 px-5 pb-10 pt-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5"><Logo dark className="h-10 w-10" /><span className="text-xl font-black">پارامیس‌تک</span></div>
          <p className="mt-4 max-w-xs leading-8 text-background/55">استودیو طراحی و توسعه نرم‌افزار؛ سازنده محصولات دیجیتالی که دیده می‌شوند و ماندگارند.</p>
          {live.length > 0 && <div className="mt-6 flex gap-2">
            {live.map((s) => <a key={s.l} href={settings[s.k]} target="_blank" rel="noreferrer" aria-label={s.l} className="flex h-10 w-10 items-center justify-center rounded-full border border-background/15 text-background/70 transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"><s.i className="h-4 w-4" /></a>)}
          </div>}
        </div>
        <div><h4 className="mb-4 text-sm text-background/45">دسترسی سریع</h4>
          <div className="grid gap-3">{nav.map((n) => <button key={n.id} onClick={() => scrollTo(n.id)} className="w-fit text-right font-semibold transition-colors hover:text-accent">{n.label}</button>)}</div></div>
        <div><h4 className="mb-4 text-sm text-background/45">ارتباط با ما</h4>
          <a href={`mailto:${email}`} className="text-lg font-bold transition-colors hover:text-accent" dir="ltr">{email}</a>
          {settings['contact.phone'] && <a href={`tel:${settings['contact.phone']}`} className="mt-2 block font-bold transition-colors hover:text-accent" dir="ltr">{settings['contact.phone']}</a>}
          <p className="mt-3 text-sm leading-7 text-background/55">{settings['contact.note'] || 'همکاری حضوری و ریموت در سراسر ایران'}</p>
          <a href="/portal" className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-black text-accent-foreground">ورود مشتریان <ArrowLeft className="h-4 w-4" /></a></div>
      </div>
      <div className="container mx-auto max-w-6xl px-5">
        <p className="select-none bg-gradient-to-b from-background/15 to-transparent bg-clip-text text-center text-[clamp(4rem,17vw,13rem)] font-black leading-none text-transparent" dir="ltr">PARAMIS</p>
      </div>
      <div className="border-t border-background/10 py-6 text-center text-xs text-background/45">© {new Date().getFullYear().toLocaleString('fa-IR', { useGrouping: false })} پارامیس‌تک — تمامی حقوق محفوظ است.</div>
    </footer>
  );
}
