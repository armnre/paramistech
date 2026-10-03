import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectCard, ServiceCard } from '@/components/home-sections';
import { LocaleLink, SectionHeader } from '@/components/page-parts';

export const metadata: Metadata = { title: 'Design System', robots: { index: false, follow: false } };
const tokens = [['پس‌زمینه', '--bg'], ['سطح', '--surface'], ['نعنایی', '--mint'], ['متن', '--text'], ['متن فرعی', '--muted'], ['اصلی', '--primary'], ['طلایی', '--gold']];

// Development-only review page for the design tokens and shared components.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main id="main" className="container section">
      <SectionHeader title="سیستم طراحی" subtitle="رنگ‌ها و اجزای رابط کاربری" />
      <div className="services-grid">
        {tokens.map(([name, token]) => (
          <div className="card" key={token} style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: `var(${token})`, border: '1px solid var(--border)' }} />
            <span>{name} <small style={{ display: 'block', direction: 'ltr', color: 'var(--muted)' }}>{token}</small></span>
          </div>
        ))}
      </div>
      <section className="section">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <LocaleLink locale="fa" className="btn btn-primary" href="/contact">شروع پروژه</LocaleLink>
          <LocaleLink locale="en" className="btn btn-outline" href="/contact">Start a project</LocaleLink>
          <span className="chip active">برچسب فعال</span>
        </div>
      </section>
      <div className="inner-grid">
        <ServiceCard locale="fa" service={{ slug: 'example', icon: 'building', title: 'کارت خدمت', shortDescription: 'نمونه برای بازبینی طراحی.' }} />
        <ProjectCard locale="en" project={{ slug: 'example', category: 'Sample', title: 'Project card', summary: 'Sample for design review.', cover: null, art: 'finance' }} />
      </div>
    </main>
  );
}
