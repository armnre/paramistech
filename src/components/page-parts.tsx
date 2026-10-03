import Link from 'next/link';
import type { ReactNode } from 'react';
import { arrowsFor } from '@/components/arrows';
import { getDictionary } from '@/lib/i18n';
import { prefixPath, type Locale } from '@/lib/i18n/dictionary';

/** Internal link that keeps the visitor in their language. */
export function LocaleLink({
  locale,
  href,
  children,
  ...rest
}: { locale: Locale; href: string; children: ReactNode } & Omit<React.ComponentProps<typeof Link>, 'href'>) {
  return (
    <Link href={prefixPath(locale, href)} {...rest}>
      {children}
    </Link>
  );
}

export function SectionHeader({ title, subtitle, centered = true }: { title: string; subtitle?: string; centered?: boolean }) {
  return (
    <div className={`section-header ${centered ? 'center' : ''}`}>
      <span className="eyebrow-line" />
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function PageIntro({ locale, title, subtitle, crumb }: { locale: Locale; title: string; subtitle?: string; crumb: string }) {
  const dict = getDictionary(locale);
  return (
    <section className="page-hero">
      <div className="container">
        <nav className="breadcrumb" aria-label={dict.a11y.breadcrumb}>
          <LocaleLink locale={locale} href="/">{dict.a11y.home}</LocaleLink> / {crumb}
        </nav>
        <span className="eyebrow-line" />
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </section>
  );
}

export function ArrowLink({ locale, href, children, ariaLabel }: { locale: Locale; href: string; children: ReactNode; ariaLabel?: string }) {
  const { Forward } = arrowsFor(locale);
  return (
    <LocaleLink locale={locale} href={href} className="text-link" aria-label={ariaLabel}>
      {children}
      <Forward size={16} strokeWidth={1.7} aria-hidden="true" />
    </LocaleLink>
  );
}
