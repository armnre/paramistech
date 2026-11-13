import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo, ease } from './ui-bits';

export default function Preloader() {
  const [n, setN] = useState(0);
  const [show, setShow] = useState(() => !sessionStorage.getItem('pt-loaded'));
  useEffect(() => {
    if (!show) return;
    const t = setInterval(() => setN((v) => Math.min(100, v + Math.ceil(Math.random() * 9))), 45);
    return () => clearInterval(t);
  }, [show]);
  useEffect(() => {
    if (n < 100) return;
    const t = setTimeout(() => { setShow(false); sessionStorage.setItem('pt-loaded', '1'); }, 300);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div exit={{ y: '-100%' }} transition={{ duration: 0.8, ease }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-foreground text-background">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease }}><Logo dark className="h-20 w-20" /></motion.div>
          <p className="mt-6 text-2xl font-black">پارامیس‌تک</p>
          <div className="mt-6 h-[2px] w-48 overflow-hidden rounded-full bg-background/15"><div className="h-full bg-accent transition-all duration-100" style={{ width: `${n}%` }} /></div>
          <p className="mt-3 text-sm tabular-nums text-background/50">{n.toLocaleString('fa-IR')}٪</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
