import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { nav, scrollTo } from '../data';
import { Logo, ease } from './ui-bits';

export default function Navbar({ onPalette }: { onPalette: () => void }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const cur = nav.filter((n) => (document.getElementById(n.id)?.getBoundingClientRect().top ?? 1e9) < 160).pop();
      setActive(cur?.id ?? '');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);

  const go = (id: string) => { setOpen(false); setTimeout(() => scrollTo(id), open ? 300 : 0); };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6">
      <motion.div style={{ scaleX: progress, transformOrigin: 'right' }} className="fixed inset-x-0 top-0 h-[3px] bg-accent" />
      <div className={`mx-auto flex max-w-6xl items-center justify-between rounded-full py-2 pl-2 pr-4 transition-all duration-500 ${scrolled || open ? 'glass shadow-soft' : 'border border-transparent'}`}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5" aria-label="پارامیس‌تک">
          <Logo className="h-9 w-9" />
          <span className="text-base font-black tracking-tight sm:text-lg">پارامیس‌تک</span>
        </button>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${active === n.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {active === n.id && <motion.span layoutId="navpill" className="absolute inset-0 -z-10 rounded-full bg-muted" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
              {n.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="ghost" onClick={onPalette} className="hidden rounded-full md:inline-flex" aria-label="جست‌وجو (Ctrl+K)"><Search className="h-4 w-4" /></Button>
          <Button asChild variant="ghost" className="hidden h-10 rounded-full px-4 font-bold md:inline-flex"><a href="/portal">ورود مشتریان</a></Button>
          <Button onClick={() => go('contact')} className="hidden h-10 rounded-full bg-foreground px-5 font-bold text-background hover:bg-foreground/90 sm:inline-flex">شروع پروژه</Button>
          <Button size="icon" variant="ghost" className="rounded-full lg:hidden" onClick={() => setOpen(!open)} aria-label="منو">{open ? <X /> : <Menu />}</Button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease }}
            className="glass mx-auto mt-2 max-w-6xl rounded-[2rem] p-4 shadow-soft lg:hidden">
            {nav.map((n, i) => (
              <motion.button key={n.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, ease }} onClick={() => go(n.id)}
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-right text-lg font-bold hover:bg-muted">
                {n.label}<ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </motion.button>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2"><Button asChild variant="outline" className="h-12 rounded-full text-base font-bold"><a href="/portal">ورود مشتریان</a></Button><Button onClick={() => go('contact')} className="h-12 rounded-full text-base font-bold">شروع پروژه</Button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
