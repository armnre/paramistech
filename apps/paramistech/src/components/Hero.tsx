import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { scrollTo, stack } from '../data';
import { useContent } from '../content';
import { ease } from './ui-bits';

const up = (d: number) => ({ initial: { opacity: 0, y: 40, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { delay: d, duration: 0.9, ease } });

function Blob({ className, x, y, d }: { className: string; x: number[]; y: number[]; d: number }) {
  return <motion.div aria-hidden className={`absolute rounded-full blur-[90px] md:blur-[120px] ${className}`} animate={{ x, y, scale: [1, 1.15, 1] }} transition={{ duration: d, repeat: Infinity, ease: 'easeInOut' }} />;
}

const words = ['ماندگار', 'سریع', 'زیبا', 'هوشمند'];

function Rotator() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % words.length), 2600); return () => clearInterval(t); }, []);
  return (
    <span className="relative inline-flex h-[1.2em] overflow-hidden align-bottom text-foreground">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={words[i]} initial={{ y: '100%', opacity: 0, filter: 'blur(6px)' }} animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }} exit={{ y: '-100%', opacity: 0, filter: 'blur(6px)' }} transition={{ duration: 0.6, ease }} className="relative inline-block">
          {words[i]}
          <svg viewBox="0 0 300 20" className="absolute -bottom-0 left-0 h-[0.22em] w-full text-accent" preserveAspectRatio="none"><path d="M4 14 C 80 4, 200 4, 296 12" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" /></svg>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function Hero() {
  const { settings } = useContent();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const mx = useSpring(useMotionValue(50), { stiffness: 60, damping: 20 });
  const my = useSpring(useMotionValue(30), { stiffness: 60, damping: 20 });
  const glow = useMotionTemplate`radial-gradient(500px circle at ${mx}% ${my}%, hsl(var(--accent) / .22), transparent 60%)`;
  const onMove = (e: React.MouseEvent) => { const r = e.currentTarget.getBoundingClientRect(); mx.set(((e.clientX - r.left) / r.width) * 100); my.set(((e.clientY - r.top) / r.height) * 100); };

  return (
    <section ref={ref} onMouseMove={onMove} className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-16 pt-28 md:pt-32">
      {/* animated gradient mesh */}
      <div className="absolute inset-0 -z-10">
        <Blob className="-top-20 right-[5%] h-[340px] w-[340px] bg-secondary/60 md:h-[560px] md:w-[560px]" x={[0, -60, 0]} y={[0, 50, 0]} d={14} />
        <Blob className="left-[0%] top-[25%] h-[300px] w-[300px] bg-accent/50 md:h-[480px] md:w-[480px]" x={[0, 70, 0]} y={[0, -40, 0]} d={16} />
        <Blob className="bottom-[-10%] right-[30%] h-[260px] w-[260px] bg-secondary/35 md:h-[420px] md:w-[420px]" x={[0, 40, 0]} y={[0, -60, 0]} d={18} />
        <div className="absolute inset-0 [background-image:linear-gradient(hsl(var(--foreground)/.06)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/.06)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <motion.div className="absolute inset-0 hidden md:block" style={{ background: glow }} />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <motion.div style={{ y, opacity }} className="container relative mx-auto max-w-5xl px-5 text-center">
        <motion.button {...up(0)} onClick={() => scrollTo('contact')} className="group mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/70 py-1.5 pl-1.5 pr-4 text-sm font-semibold shadow-soft backdrop-blur transition-colors hover:bg-card">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent" /><span className="relative h-2 w-2 rounded-full bg-accent" /></span>
          پذیرش پروژه‌های جدید
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:-translate-x-0.5"><ArrowLeft className="h-3.5 w-3.5" /></span>
        </motion.button>

        <h1 className="mt-8 text-[clamp(2.6rem,9vw,6.75rem)] font-black leading-[1.15] tracking-tight md:mt-10">
          <motion.span {...up(0.1)} className="block">ایده‌ی شما،</motion.span>
          <motion.span {...up(0.2)} className="block">محصولی <Rotator /></motion.span>
        </h1>

        <motion.p {...up(0.35)} className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground md:mt-8 md:text-xl md:leading-9">
          {settings['hero.lead'] || <><b className="text-foreground">پارامیس‌تک</b> استودیوی طراحی و توسعه نرم‌افزار است؛ از فروشگاه اینترنتی و سامانه رزرو آنلاین تا سامانه‌های جامع سازمانی، محصولاتی می‌سازیم که زیبا، سریع و قابل اعتمادند.</>}
        </motion.p>

        <motion.div {...up(0.45)} className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button size="lg" onClick={() => scrollTo('contact')} className="group h-14 rounded-full px-8 text-base font-bold shadow-[0_12px_40px_-12px_hsl(var(--foreground)/.6)]">
            ثبت درخواست پروژه
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => scrollTo('projects')} className="h-14 rounded-full bg-card/60 px-8 text-base backdrop-blur">مشاهده نمونه‌کارها</Button>
        </motion.div>

        <motion.div {...up(0.6)} className="relative mx-auto mt-14 max-w-3xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]" dir="ltr">
          <motion.div className="flex w-max gap-8 text-sm font-semibold text-muted-foreground" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
            {[...stack, ...stack].map((t, i) => <span key={i} className="flex items-center gap-8">{t}<span className="h-1 w-1 rounded-full bg-muted-foreground/40" /></span>)}
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.button onClick={() => scrollTo('services')} aria-label="ادامه" initial={{ opacity: 0 }} animate={{ opacity: 1, y: [0, 8, 0] }} transition={{ opacity: { delay: 1.2 }, y: { duration: 2, repeat: Infinity } }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs text-muted-foreground md:flex">
        اسکرول کنید<ChevronDown className="h-4 w-4" />
      </motion.button>
    </section>
  );
}
