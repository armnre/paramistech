import { motion, useInView, animate } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode, type MouseEvent, type ComponentType } from 'react';
import { cn } from '@project/components/lib/utils';

export const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Unified vertical rhythm & width for every section */
export const sectionCls = 'container mx-auto max-w-6xl scroll-mt-24 px-5 py-20 md:py-28';

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, delay, ease }} className={className}>
      {children}
    </motion.div>
  );
}

export function SectionHead({ kicker, title, desc, center = true, en, dark }: { kicker: string; title: ReactNode; desc?: string; center?: boolean; en?: string; dark?: boolean }) {
  return (
    <Reveal className={cn('mb-12 md:mb-16', center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl')}>
      <span className={cn('inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold', dark ? 'border-background/15 bg-background/5 text-background/70' : 'border-border bg-card text-muted-foreground shadow-soft')}>
        <span className="h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-accent/30" />{kicker}
        {en && <span className={cn('font-serif-en text-sm', dark ? 'text-background/45' : 'text-foreground/45')} dir="ltr">— {en}</span>}
      </span>
      <h2 className="mt-5 text-balance text-[clamp(1.85rem,4.2vw,3.25rem)] font-black leading-[1.3] tracking-tight">{title}</h2>
      {desc && <p className={cn('mt-4 text-base leading-8 md:text-[17px]', dark ? 'text-background/60' : 'text-muted-foreground', center && 'mx-auto max-w-xl')}>{desc}</p>}
    </Reveal>
  );
}

export function IconTile({ icon: Icon, className }: { icon: ComponentType<{ className?: string }>; className?: string }) {
  return <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-accent transition-transform duration-500 group-hover:-rotate-6', className)}><Icon className="h-5 w-5" /></span>;
}

export function Spotlight({ className, children }: { className?: string; children: ReactNode }) {
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return <div onMouseMove={move} className={cn('spotlight group rounded-3xl border border-border bg-card shadow-soft transition-all duration-500 hover:-translate-y-1', className)}>{children}</div>;
}

export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.8, ease, onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{v.toLocaleString('fa-IR')}{suffix}</span>;
}

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <path fillRule="evenodd" d="M9.5 5h8.5a7.5 7.5 0 0 1 0 15h-2.2a1.8 1.8 0 0 0-1.8 1.8V25a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4.5 5v5h3.6a2.5 2.5 0 0 0 0-5Z" fill={dark ? 'hsl(var(--background))' : 'hsl(var(--foreground))'} />
      <circle cx="19.6" cy="24.4" r="2.9" fill="hsl(var(--accent))" />
    </svg>
  );
}
