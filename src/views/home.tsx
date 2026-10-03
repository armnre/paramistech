import { FinalCta, Hero, Process, Projects, Services } from '@/components/home-sections';
import { PageShell } from '@/components/page-shell';
import { getLocalizedProjects, getLocalizedServices } from '@/lib/content';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/dictionary';
import { inLanguage, JsonLd } from '@/lib/json-ld';
import { absoluteUrl, samePaths, switcherHref } from '@/lib/seo';
import { pageMetadata } from '@/views/shared';

export const homeMetadata = (locale: Locale) => pageMetadata(locale, samePaths('/'), {});

export async function HomeView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [services, projects] = await Promise.all([getLocalizedServices(locale), getLocalizedProjects(locale)]);
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: dict.site.brand, url: absoluteUrl(locale, '/'), description: dict.site.description },
      { '@type': 'WebSite', name: dict.site.brand, url: absoluteUrl(locale, '/'), inLanguage: inLanguage(locale) },
    ],
  };
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, samePaths('/'))}>
      <main id="main">
        <Hero locale={locale} />
        <Services locale={locale} items={services} />
        <Projects locale={locale} items={projects} />
        <Process locale={locale} />
        <FinalCta locale={locale} />
        <JsonLd data={structured} />
      </main>
    </PageShell>
  );
}
