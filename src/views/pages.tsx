import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { FinalCta } from '@/components/home-sections';
import { PageIntro } from '@/components/page-parts';
import { PageShell } from '@/components/page-shell';
import { getContact, getLocalizedFaqs } from '@/lib/content';
import { analyticsOriginFromEnv } from '@/lib/csp';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/dictionary';
import { breadcrumbList, inLanguage, JsonLd } from '@/lib/json-ld';
import { samePaths, switcherHref } from '@/lib/seo';
import { pageMetadata } from '@/views/shared';

// ---------- about ----------

export function aboutMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  return pageMetadata(locale, samePaths('/about'), { title: dict.about.title, description: dict.about.subtitle });
}

export function AboutView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, samePaths('/about'))}>
      <main id="main">
        <PageIntro locale={locale} title={dict.about.title} subtitle={dict.about.subtitle} crumb={dict.about.title} />
        <section className="section">
          <div className="container">
            <div className="prose-block"><p className="lead">{dict.about.story}</p></div>
            <div className="inner-grid about-grid">
              <article className="card service-card"><h2>{dict.about.mission}</h2><p>{dict.about.missionText}</p></article>
              <article className="card service-card"><h2>{dict.about.vision}</h2><p>{dict.about.visionText}</p></article>
            </div>
            <h2 className="about-values">{dict.about.values}</h2>
            <div className="projects-grid">
              {dict.about.valueItems.map((value) => (
                <article className="card service-card" key={value.title}><h3>{value.title}</h3><p>{value.description}</p></article>
              ))}
            </div>
          </div>
        </section>
        <FinalCta locale={locale} />
        <JsonLd data={breadcrumbList(locale, [{ name: dict.a11y.home, path: '/' }, { name: dict.about.title, path: '/about' }])} />
      </main>
    </PageShell>
  );
}

// ---------- contact ----------

export function contactMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  return pageMetadata(locale, samePaths('/contact'), { title: dict.contact.metaTitle, description: dict.contact.subtitle });
}

export async function ContactView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const contact = await getContact(locale);
  const hasDetails = contact && (contact.email || contact.phone || contact.address);
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, samePaths('/contact'))}>
      <main id="main">
        <PageIntro locale={locale} title={dict.contact.title} subtitle={dict.contact.subtitle} crumb={dict.contact.crumb} />
        <section className="section">
          <div className="container contact-layout">
            <ContactForm locale={locale} copy={dict.contact} stepsLabel={dict.a11y.formSteps} />
            {hasDetails && (
              <aside className="card contact-info">
                <h2>{dict.contact.eyebrow}</h2>
                <p>{dict.site.description}</p>
                <ul className="footer-list footer-contact">
                  {contact.email && <li><Mail size={18} aria-hidden="true" /><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
                  {contact.phone && <li><Phone size={18} aria-hidden="true" /><a href={`tel:${contact.phoneHref}`} dir="ltr">{contact.phone}</a></li>}
                  {contact.address && <li><MapPin size={18} aria-hidden="true" /><span>{contact.address}</span></li>}
                </ul>
              </aside>
            )}
          </div>
        </section>
        <JsonLd data={breadcrumbList(locale, [{ name: dict.a11y.home, path: '/' }, { name: dict.contact.crumb, path: '/contact' }])} />
      </main>
    </PageShell>
  );
}

// ---------- FAQ ----------

export function faqMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  return pageMetadata(locale, samePaths('/faq'), { title: dict.faq.title, description: dict.faq.subtitle });
}

export async function FaqView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const items = await getLocalizedFaqs(locale);
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: inLanguage(locale),
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, samePaths('/faq'))}>
      <main id="main">
        <PageIntro locale={locale} title={dict.faq.title} subtitle={dict.faq.subtitle} crumb={dict.faq.title} />
        <section className="section">
          <div className="container faq-list">
            {items.length === 0 ? (
              <div className="card admin-empty">{dict.faq.empty}</div>
            ) : (
              items.map((item) => (
                <details className="card faq-item" key={item.id}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))
            )}
          </div>
        </section>
        {items.length > 0 && <JsonLd data={structured} />}
        <JsonLd data={breadcrumbList(locale, [{ name: dict.a11y.home, path: '/' }, { name: dict.faq.title, path: '/faq' }])} />
      </main>
    </PageShell>
  );
}

// ---------- legal ----------

export function legalMetadata(locale: Locale, kind: 'privacy' | 'terms'): Metadata {
  const dict = getDictionary(locale);
  const privacy = kind === 'privacy';
  return pageMetadata(locale, samePaths(`/${kind}`), {
    title: privacy ? dict.legal.privacyTitle : dict.legal.termsTitle,
    description: privacy ? dict.legal.privacyDescription : dict.legal.termsDescription,
    noindex: true,
  });
}

export function LegalView({ locale, kind }: { locale: Locale; kind: 'privacy' | 'terms' }) {
  const dict = getDictionary(locale);
  const privacy = kind === 'privacy';
  const title = privacy ? dict.legal.privacyTitle : dict.legal.termsTitle;
  const analyticsOrigin = analyticsOriginFromEnv();
  const analyticsNote = analyticsOrigin
    ? dict.legal.analyticsOn.replace('{host}', new URL(analyticsOrigin).host)
    : dict.legal.analyticsOff;
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, samePaths(`/${kind}`))}>
      <main id="main">
        <PageIntro locale={locale} title={title} crumb={title} />
        <section className="section">
          <div className="container prose-block legal">
            <p>{privacy ? dict.legal.privacyBody : dict.legal.termsBody}</p>
            {privacy && (
              <>
                <h2>{dict.legal.cookiesHeading}</h2>
                <p>{dict.legal.cookiesBody}</p>
                <p>{analyticsNote}</p>
              </>
            )}
          </div>
        </section>
        <JsonLd data={breadcrumbList(locale, [{ name: dict.a11y.home, path: '/' }, { name: title, path: `/${kind}` }])} />
      </main>
    </PageShell>
  );
}
