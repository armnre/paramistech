import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { siteContent, type SiteContentOutputType } from 'zitejs/api';
import * as base from './data';

const covers = [
  'https://images.fillout.com/924335/7eeczg89ng/generated-images/dpMHLoPVo2pfUgurjnR5P7/img_KFnanekgHznWe0dy.jpg',
  'https://images.fillout.com/924335/7eeczg89ng/generated-images/pEcgvVepAHV48N8WkYT3Le/img_gL0SOo9xkRPBYwlG.jpg',
  'https://images.fillout.com/924335/7eeczg89ng/generated-images/raoohGPv9PEAtbxWV6s4GH/img_kxRCCS3iiMYoN7Au.jpg',
  'https://images.fillout.com/924335/7eeczg89ng/generated-images/iu9tJFgBAuHFrodAnGoFXt/img_551rp9Jg8SJ5QGEe.jpg',
];
const shot = (u: string) => `https://s0.wp.com/mshots/v1/${encodeURIComponent(u)}?w=1200&h=900`;
const split = (s: string) => s.split(/[,،]/).map((x) => x.trim()).filter(Boolean);

function build(raw: SiteContentOutputType | null) {
  const of = (k: string) => raw?.items.filter((i) => i.kind === k) ?? [];
  const sv = of('خدمت'), pj = of('نمونه‌کار'), ts = of('نظر مشتری'), fq = of('سوال متداول'), st = of('آمار');
  const icons = base.services.map((s) => s.icon);
  return {
    services: sv.length ? sv.map((s, i) => ({ cat: s.category || 'طراحی و توسعه', icon: base.services.find((b) => b.title === s.title)?.icon ?? icons[i % icons.length], title: s.title, desc: s.body, tags: split(s.tags) })) : base.services.map((s) => ({ ...s, cat: 'طراحی و توسعه' })),
    projects: pj.length ? pj.map((p, i) => ({ cat: p.category || 'سایر', status: p.status || 'منتشرشده', featured: p.featured, client: p.subtitle, title: p.title, desc: p.body, url: p.link, stack: split(p.tags), embed: p.embed, image: p.image || (p.link ? shot(p.link) : covers[i % covers.length]) })) : base.projects.map((p, i) => ({ ...p, status: 'منتشرشده', featured: false, embed: false, image: shot(p.url) })),
    testimonials: ts.length ? ts.map((t) => ({ name: t.title, role: t.subtitle, text: t.body })) : raw ? [] : base.testimonials,
    faqs: fq.length ? fq.map((f) => ({ q: f.title, a: f.body })) : base.faqs,
    stats: st.length ? st.map((s) => ({ n: Number(s.subtitle.replace(/[^\d.]/g, '')) || 0, s: s.tags, l: s.title })) : raw ? [] : base.stats,
    settings: raw?.settings ?? {} as Record<string, string>,
  };
}
export type Content = ReturnType<typeof build>;
const Ctx = createContext<Content>(build(null));
export const useContent = () => useContext(Ctx);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<SiteContentOutputType | null>(null);
  useEffect(() => { siteContent({}).then(setRaw).catch(() => {}); }, []);
  const value = useMemo(() => build(raw), [raw]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
