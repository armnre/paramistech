import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useContent } from '../content';
import { SectionHead, sectionCls } from './ui-bits';

export default function Testimonials() {
  const { testimonials } = useContent();
  const [i, setI] = useState(0);
  const n = testimonials.length;
  useEffect(() => { if (!n) return; const t = setInterval(() => setI((v) => (v + 1) % n), 7000); return () => clearInterval(t); }, [i, n]);
  const t = testimonials[i % Math.max(n, 1)];
  if (!n || !t) return null;
  return (
    <section className={sectionCls}>
      <SectionHead kicker="نظر مشتریان" en="Kind words" title={<>آن‌ها به ما <span className="text-gradient">اعتماد کردند</span></>} />
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8 md:p-12">
        <Quote className="absolute left-8 top-8 h-16 w-16 text-primary/10" />
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45 }}>
            <p className="text-[clamp(1.05rem,2.2vw,1.45rem)] font-bold leading-[1.95]">«{t.text}»</p>
            <div className="mt-8 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-lg font-black text-accent">{t.name[0]}</span>
              <div><p className="font-black">{t.name}</p><p className="text-sm text-muted-foreground">{t.role}</p></div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-10 flex items-center justify-between">
          <div className="flex gap-2">{testimonials.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`نظر ${k + 1}`} className={`h-2 rounded-full transition-all duration-500 ${k === i ? 'w-8 bg-foreground' : 'w-2 bg-border'}`} />)}</div>
          <div className="flex gap-2">
            <button onClick={() => setI((i - 1 + n) % n)} aria-label="قبلی" className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
            <button onClick={() => setI((i + 1) % n)} aria-label="بعدی" className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90"><ChevronLeft className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
