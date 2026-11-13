import { useEffect, useRef, useState } from 'react';
import { Building2, CalendarCheck, GraduationCap, Lock, ShoppingBag, Sparkles } from 'lucide-react';

const auto = (s?: string) => !s || /mshots|thum\.io/.test(s);
const W = 1280;

function Frame({ host, children }: { host: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-primary/15 via-muted to-accent/25 p-3 sm:p-4">
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2" dir="ltr">
          <span className="h-2 w-2 rounded-full bg-red-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="ml-2 flex min-w-0 flex-1 items-center gap-1 truncate rounded-md bg-card px-2 py-0.5 text-[10px] text-muted-foreground"><Lock className="h-2.5 w-2.5 shrink-0" />{host}</span>
        </div>
        <div className="relative flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function Live({ url, title, cat }: { url: string; title: string; cat?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [seen, setSeen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: '200px' });
    ro.observe(el); io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);
  return (
    <div ref={box} className="absolute inset-0">
      <Placeholder title={title} cat={cat} />
      {seen && (
        <iframe src={url} title={title} loading="lazy" tabIndex={-1} aria-hidden sandbox="allow-scripts allow-same-origin" onLoad={() => setLoaded(true)}
          className={`pointer-events-none absolute right-0 top-0 origin-top-right border-0 bg-white transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ width: W, height: `${100 / scale}%`, transform: `scale(${scale})` }} />
      )}
    </div>
  );
}

const themes = [
  { k: 'فروشگاه', Icon: ShoppingBag, g: 'from-emerald-500 via-teal-600 to-cyan-700', word: 'فروشگاه' },
  { k: 'رزرو', Icon: CalendarCheck, g: 'from-rose-500 via-red-600 to-orange-600', word: 'رزرو' },
  { k: 'دانشگاه', Icon: GraduationCap, g: 'from-sky-600 via-blue-700 to-indigo-800', word: 'سامانه' },
  { k: 'سازمان', Icon: Building2, g: 'from-sky-600 via-blue-700 to-indigo-800', word: 'سامانه' },
];

function Placeholder({ title, cat = '', host = '' }: { title: string; cat?: string; host?: string }) {
  const t = themes.find((x) => cat.includes(x.k) || title.includes(x.k)) ?? { Icon: Sparkles, g: 'from-primary via-primary to-foreground', word: 'پروژه' };
  const name = title.replace(/^(سامانه|فروشگاه اینترنتی)\s*/, '').split('—')[0].trim();
  return (
    <div dir="rtl" className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${t.g} text-white`}>
      <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:16px_16px]" />
      <span className="pointer-events-none absolute -bottom-6 -left-2 select-none text-[5.5rem] font-black leading-none text-white/10 sm:text-[7rem]">{t.word}</span>
      <t.Icon className="absolute -left-6 -top-6 h-32 w-32 rotate-12 text-white/10" strokeWidth={1.2} />
      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur"><t.Icon className="h-[18px] w-[18px]" /></span>
          {cat && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold ring-1 ring-white/25">{cat}</span>}
        </div>
        <div className="space-y-1.5">
          <div className="line-clamp-2 text-lg font-black leading-8 drop-shadow sm:text-xl">{name}</div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-white/75"><span className="h-px w-6 bg-white/50" />طراحی و توسعه: پارامیس‌تک</div>
          {host && <div className="text-[10px] text-white/60" dir="ltr">{host}</div>}
        </div>
      </div>
    </div>
  );
}

export default function SiteCover({ image, title, url, live, cat, className = '' }: { image?: string; title: string; url?: string; live?: boolean; cat?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const host = url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'paramistech.ir';
  if (!auto(image) && !failed)
    return <img src={image} alt={title} loading="lazy" onError={() => setFailed(true)} className={`h-full w-full object-cover object-top ${className}`} />;
  return (
    <div className={`h-full w-full ${className}`}>
      {live && url ? <Frame host={host}><Live url={url} title={title} cat={cat} /></Frame> : <div className="relative h-full w-full"><Placeholder title={title} cat={cat} host={host} /></div>}
    </div>
  );
}
