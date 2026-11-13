import SiteCover from './SiteCover';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpLeft, Building2, CalendarCheck, ExternalLink, LayoutGrid, ShoppingBag, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { fa, scrollTo } from '../data';
import { useContent, type Content } from '../content';
import { SectionHead, sectionCls } from './ui-bits';

const icon = (k: string) => k === 'همه' ? LayoutGrid : k.includes('فروشگاه') ? ShoppingBag : k.includes('رزرو') ? CalendarCheck : /سازمان|دانشگاه/.test(k) ? Building2 : Sparkles;
type P = Content['projects'][number];
const host = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

function Status({ s }: { s: string }) {
  const live = s !== 'در حال طراحی';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-soft backdrop-blur">
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500' : 'animate-pulse bg-amber-500'}`} />{live ? 'آنلاین' : 'در حال طراحی'}
    </span>
  );
}

function Card({ p, onOpen, big }: { p: P; onOpen: () => void; big?: boolean }) {
  return (
    <button onClick={onOpen} className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-right shadow-soft transition-all active:scale-[0.98] md:rounded-3xl duration-500 hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative overflow-hidden bg-muted ${big ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
        <SiteCover cat={p.cat} live={p.embed} image={p.image} title={p.title} url={p.url} className="transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute right-3 top-3"><Status s={p.status} /></div>
        <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center md:h-10 md:w-10 justify-center rounded-full bg-card shadow-soft transition-transform duration-500 group-hover:-rotate-45"><ArrowUpLeft className="h-4 w-4" /></span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-accent px-2.5 py-1 font-bold text-accent-foreground">{p.cat}</span>
          {p.client && <span className="truncate text-muted-foreground">{p.client}</span>}
        </div>
        <h3 className={`mt-3 font-black leading-8 ${big ? 'text-xl md:text-2xl' : 'text-lg'}`}>{p.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-7 text-muted-foreground">{p.desc}</p>
        {p.url && <span className="mt-auto pt-4 text-xs font-bold text-muted-foreground" dir="ltr">{host(p.url)}</span>}
      </div>
    </button>
  );
}

export default function Projects() {
  const { projects } = useContent();
  const cats = Array.from(new Set(projects.map((p) => p.cat)));
  const [cat, setCat] = useState('همه');
  const [sel, setSel] = useState<P | null>(null);
  const filtered = projects.filter((p) => cat === 'همه' || p.cat === cat);
  const featured = cat === 'همه' ? filtered.filter((p) => p.featured).slice(0, 2) : [];
  const rest = filtered.filter((p) => !featured.includes(p));
  const tabs = [{ k: 'همه', n: projects.length }, ...cats.map((k) => ({ k, n: projects.filter((p) => p.cat === k).length }))];

  return (
    <section id="projects" className={sectionCls}>
      <SectionHead kicker="نمونه‌کارها" en="Selected works" title={<>محصولاتی که <span className="text-gradient">امروز در حال کارند</span></>} desc="از فروشگاه اینترنتی و سامانه رزرو آنلاین تا سامانه‌های جامع دانشگاهی؛ هر پروژه با دقت طراحی و با کیفیت تحویل شده است." />
      <div className="relative -mx-5 mb-8 md:mx-0 md:mb-12 md:flex md:justify-center">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent md:hidden" />
        <div className="flex snap-x gap-1.5 overflow-x-auto px-5 py-1 [scrollbar-width:none] md:inline-flex md:rounded-2xl md:border md:border-border md:bg-card/70 md:p-1.5 md:shadow-soft md:backdrop-blur [&::-webkit-scrollbar]:hidden">
          {tabs.map(({ k, n }) => {
            const Icon = icon(k); const on = cat === k;
            return (
              <button key={k} onClick={() => setCat(k)} className={`relative flex shrink-0 snap-start items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-colors md:px-4 md:text-sm ${on ? 'text-primary-foreground' : 'bg-card text-muted-foreground ring-1 ring-border hover:text-foreground md:bg-transparent md:ring-0'}`}>
                {on && <motion.span layoutId="catpill" className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-lg shadow-primary/25" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
                <Icon className="h-4 w-4" />{k}
                <span className={`grid h-5 min-w-5 place-items-center rounded-md px-1 text-[11px] ${on ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{fa(n)}</span>
              </button>
            );
          })}
        </div>
      </div>
      {featured.length > 0 && (
        <div className="mb-4 grid gap-4 md:mb-5 md:grid-cols-2 md:gap-5">
          {featured.map((p) => <motion.div key={p.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}><Card big p={p} onOpen={() => setSel(p)} /></motion.div>)}
        </div>
      )}
      <motion.div layout className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {rest.map((p) => (
            <motion.div layout key={p.title} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.45 }}>
              <Card p={p} onOpen={() => setSel(p)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-h-[88vh] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-3xl p-0" dir="rtl">
          {sel && (<>
            <div className="relative aspect-[16/10] overflow-hidden bg-muted"><SiteCover cat={sel.cat} live={sel.embed} image={sel.image} title={sel.title} url={sel.url} /><div className="absolute right-4 top-4"><Status s={sel.status} /></div></div>
            <div className="space-y-5 p-5 sm:p-6 md:p-8">
              <DialogHeader className="space-y-3 text-right">
                <span className="w-fit rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{sel.cat}</span>
                <DialogTitle className="text-xl font-black leading-9 sm:text-2xl md:text-3xl">{sel.title}</DialogTitle>
                <DialogDescription className="text-base leading-8">{sel.desc}</DialogDescription>
              </DialogHeader>
              {sel.stack.length > 0 && <div className="flex flex-wrap gap-2">{sel.stack.map((t) => <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{t}</span>)}</div>}
              <div className="grid gap-2 sm:grid-cols-2">
                {sel.url && sel.status !== 'در حال طراحی' && <Button asChild variant="outline" className="h-12 rounded-full text-base"><a href={sel.url} target="_blank" rel="noreferrer">مشاهده سایت<ExternalLink className="h-4 w-4" /></a></Button>}
                <Button className="h-12 rounded-full text-base font-bold" onClick={() => { setSel(null); scrollTo('contact'); }}>پروژه‌ای مشابه می‌خواهم</Button>
              </div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>
    </section>
  );
}
