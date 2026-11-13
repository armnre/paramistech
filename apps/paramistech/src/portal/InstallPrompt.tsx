import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

export default function InstallPrompt() {
  const [standalone, setStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pt-install-dismissed') === '1');
  const [evt, setEvt] = useState<BIP | null>(null);
  useEffect(() => {
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  if (standalone || dismissed) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const close = () => { localStorage.setItem('pt-install-dismissed', '1'); setDismissed(true); };
  return (
    <div className="fixed inset-x-3 bottom-24 z-40 flex items-center gap-3 rounded-2xl bg-foreground p-3.5 text-background shadow-soft md:bottom-6 md:left-6 md:right-auto md:w-96">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Download className="h-5 w-5" /></span>
      <div className="flex-1 text-xs leading-5"><p className="text-sm font-black">نصب اپ پارامیس‌تک</p>{ios ? 'دکمه Share و سپس «Add to Home Screen» را بزنید.' : evt ? 'برای دسترسی سریع و دریافت اعلان‌ها، اپ را نصب کنید.' : 'از منوی مرورگر گزینه «نصب برنامه» را بزنید.'}</div>
      {evt && <button onClick={async () => { await evt.prompt(); await evt.userChoice; close(); }} className="rounded-xl bg-accent px-3 py-2 text-xs font-black text-accent-foreground">نصب</button>}
      <button onClick={close} aria-label="بستن" className="p-1 text-background/60"><X className="h-4 w-4" /></button>
    </div>
  );
}
