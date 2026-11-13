import { useRef } from 'react';
import { motion, useScroll } from 'framer-motion';
import { steps, fa } from '../data';
import { useContent } from '../content';
import { IconTile, Reveal, SectionHead, Spotlight, sectionCls } from './ui-bits';

type Svc = ReturnType<typeof useContent>['services'][number];

function SvcCard({ s, n }: { s: Svc; n: number }) {
  return (
    <Spotlight className="flex h-full flex-col p-6 md:p-7">
      <div className="flex items-start justify-between">
        <IconTile icon={s.icon} />
        <span className="font-serif-en text-sm text-muted-foreground" dir="ltr">0{n}</span>
      </div>
      <h3 className="mt-6 text-lg font-black md:text-xl">{s.title}</h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.desc}</p>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-5" dir="ltr">{s.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{t}</span>)}</div>
    </Spotlight>
  );
}

export function Services() {
  const { services } = useContent();
  const cats = Array.from(new Set(services.map((s) => s.cat)));
  let n = 0;
  return (
    <section id="services" className={sectionCls}>
      <SectionHead kicker="خدمات ما" en="Our craft" title={<>هر آنچه برای <span className="text-gradient">رشد دیجیتال</span> نیاز دارید</>} desc="تیمی کامل از طراح، توسعه‌دهنده و متخصص زیرساخت؛ زیر یک سقف." />
      <div className="space-y-12 md:space-y-16">
        {cats.map((c, ci) => {
          const list = services.filter((s) => s.cat === c);
          return (
            <div key={c} className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
              <Reveal className="lg:sticky lg:top-28 lg:self-start">
                <div className="flex items-center gap-3 lg:block">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-sm font-black text-accent lg:h-12 lg:w-12">{fa(ci + 1)}</span>
                  <div className="lg:mt-4">
                    <h3 className="text-xl font-black md:text-2xl">{c}</h3>
                    <p className="text-sm text-muted-foreground">{fa(list.length)} خدمت</p>
                  </div>
                </div>
                <div className="mt-4 hidden h-px w-full bg-gradient-to-l from-border to-transparent lg:block" />
              </Reveal>
              <div className="grid gap-4 sm:grid-cols-2">
                {list.map((s, i) => { n++; const k = n; return <Reveal key={s.title} delay={(i % 2) * 0.08}><SvcCard s={s} n={k} /></Reveal>; })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  return (
    <section id="process" className="scroll-mt-24 bg-foreground text-background">
      <div className="container mx-auto max-w-6xl px-5 py-20 md:py-28">
        <SectionHead dark center={false} kicker="روند همکاری" en="How we work" title={<>از ایده تا محصول، در <span className="text-accent">۵ گام شفاف</span></>} desc="در هر مرحله دقیقاً می‌دانید پروژه کجاست و قدم بعدی چیست." />
        <div ref={ref} className="relative">
          <div className="absolute bottom-0 right-6 top-0 w-px bg-background/15 lg:inset-x-0 lg:bottom-auto lg:top-6 lg:h-px lg:w-auto" />
          <motion.div style={{ scaleY: scrollYProgress, transformOrigin: 'top' }} className="absolute bottom-0 right-6 top-0 w-px bg-accent lg:hidden" />
          <motion.div style={{ scaleX: scrollYProgress, transformOrigin: 'right' }} className="absolute inset-x-0 top-6 hidden h-px bg-accent lg:block" />
          <div className="grid gap-10 lg:grid-cols-5 lg:gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08} className="relative pr-20 lg:pr-0 lg:pt-20">
                <span className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border border-background/20 bg-foreground text-accent">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold text-background/40">مرحله {fa(i + 1)}</span>
                <h3 className="mt-1 text-lg font-black md:text-xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-background/60">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
