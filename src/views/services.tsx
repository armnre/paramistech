import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { arrowsFor } from '@/components/arrows';
import { ServiceCard } from '@/components/home-sections';
import { MarkdownView } from '@/components/markdown-view';
import { LocaleLink, PageIntro } from '@/components/page-parts';
import { PageShell } from '@/components/page-shell';
import { findService, getLocalizedServices } from '@/lib/content';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/dictionary';
import { breadcrumbList, inLanguage, JsonLd } from '@/lib/json-ld';
import type { ServiceView } from '@/lib/localize';
import { absoluteUrl, samePaths, switcherHref, type LocalePaths } from '@/lib/seo';
import { pageMetadata, type SlugParams } from '@/views/shared';

export function servicesMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  return pageMetadata(locale, samePaths('/services'), { title: dict.services.title, description: dict.services.pageSubtitle });
}

export async function ServicesView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const items = await getLocalizedServices(locale);
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, samePaths('/services'))}>
      <main id="main">
        <PageIntro locale={locale} title={dict.services.title} subtitle={dict.services.pageSubtitle} crumb={dict.services.title} />
        <section className="section">
          <div className="container">
            {items.length === 0 ? (
              <div className="card admin-empty">{dict.services.empty}</div>
            ) : (
              <div className="services-grid">
                {items.map((service) => <ServiceCard key={service.slug} locale={locale} service={service} />)}
              </div>
            )}
          </div>
        </section>
        <JsonLd data={breadcrumbList(locale, [{ name: dict.a11y.home, path: '/' }, { name: dict.services.title, path: '/services' }])} />
      </main>
    </PageShell>
  );
}

const pathsOf = (service: ServiceView): LocalePaths => ({
  fa: `/services/${service.slugs.fa}`,
  en: service.slugs.en ? `/services/${service.slugs.en}` : null,
});

export async function serviceMetadata(locale: Locale, { params }: SlugParams): Promise<Metadata> {
  const { slug } = await params;
  const service = await findService(locale, slug);
  if (!service) return { title: getDictionary(locale).notFound.title, robots: { index: false } };
  return pageMetadata(locale, pathsOf(service), {
    title: service.metaTitle || service.title,
    description: service.metaDescription || service.shortDescription,
  });
}

export async function ServiceDetailView({ locale, params }: { locale: Locale } & SlugParams) {
  const dict = getDictionary(locale);
  const { slug } = await params;
  const service = await findService(locale, slug);
  if (!service) notFound();
  const { Forward } = arrowsFor(locale);
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.shortDescription,
    inLanguage: inLanguage(locale),
    url: absoluteUrl(locale, `/services/${service.slug}`),
    provider: { '@type': 'Organization', name: dict.site.brand },
  };
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, pathsOf(service))}>
      <main id="main">
        <PageIntro locale={locale} title={service.title} subtitle={service.shortDescription} crumb={service.title} />
        <section className="section">
          <div className="container prose-block">
            <MarkdownView source={service.bodyMd} />
            <LocaleLink locale={locale} className="btn btn-primary" href="/contact">
              {dict.actions.start}
              <Forward size={17} aria-hidden="true" />
            </LocaleLink>
          </div>
        </section>
        <JsonLd data={structured} />
        <JsonLd data={breadcrumbList(locale, [
          { name: dict.a11y.home, path: '/' },
          { name: dict.services.title, path: '/services' },
          { name: service.title, path: `/services/${service.slug}` },
        ])} />
      </main>
    </PageShell>
  );
}
