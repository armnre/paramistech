import { Asterisk, Palette, Gauge, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useContent } from '../content';
import { CountUp, IconTile, Reveal, SectionHead, Spotlight, sectionCls } from './ui-bits';

const whys = [
  { icon: Palette, t: 'طراحی اختصاصی', d: 'بدون قالب آماده؛ هر صفحه برای برند و مخاطب شما طراحی می‌شود.' },
  { icon: Gauge, t: 'سرعت و سئو', d: 'بارگذاری سریع و ساختار استاندارد برای دیده‌شدن در گوگل.' },
  { icon: ShieldCheck, t: 'امنیت سازمانی', d: 'کدنویسی امن، تست و زیرساخت پایدار از روز اول.' },
  { icon: HeartHandshake, t: 'همراهی واقعی', d: 'بعد از تحویل هم کنار شما هستیم؛ پشتیبانی، بهبود و رشد.' },
];

const words = ['طراحی وب‌سایت', 'اپلیکیشن موبایل', 'سامانه دانشگاهی', 'تجربه کاربری', 'نرم‌افزار سازمانی', 'هوش مصنوعی'];
function Band({ rev, className }: { rev?: boolean; className: string }) {
  return (
    <div className={`absolute inset-x-[-4%] overflow-hidden py-3.5 md:py-4 ${className}`} dir="ltr">
      <div className="animate-marquee flex w-max items-center gap-6 md:gap-8" style={{ animationDirection: rev ? 'reverse' : 'normal' }}>
        {[...words, ...words, ...words, ...words].map((w, i) => (
          <span key={i} className="flex items-center gap-6 whitespace-nowrap text-xl font-black md:gap-8 md:text-3xl" dir="rtl">{w}<Asterisk className="h-5 w-5 shrink-0 md:h-7 md:w-7" /></span>
        ))}
      </div>
    </div>
  );
}

export default function Showcase() {
  const { stats } = useContent();
  return (
    <>
      <div className="relative mt-12 h-36 overflow-hidden md:mt-16 md:h-44">
        <Band className="top-6 -rotate-[2.5deg] bg-foreground text-background" />
        <Band rev className="top-14 rotate-[2.5deg] bg-accent text-accent-foreground md:top-[4.5rem]" />
      </div>

      <section className={sectionCls}>
        <SectionHead kicker="چرا پارامیس‌تک" en="Why us" title={<>جایی که <span className="text-gradient">هنر طراحی</span> و دقت مهندسی به هم می‌رسند</>} />
        {stats.length > 0 && <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-3xl border border-border bg-card shadow-soft md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.l} delay={i * 0.08} className={`p-6 text-center md:p-8 ${i % 2 === 0 ? 'border-l' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} md:border-l md:last:border-l-0`}>
              <p className="text-[clamp(1.9rem,3.6vw,2.75rem)] font-black tracking-tight"><CountUp to={s.n} suffix={s.s} /></p>
              <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
            </Reveal>
          ))}
        </div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {whys.map((w, i) => (
            <Reveal key={w.t} delay={i * 0.08}>
              <Spotlight className="h-full p-6 md:p-7">
                <IconTile icon={w.icon} />
                <h3 className="mt-6 text-lg font-black">{w.t}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{w.d}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
