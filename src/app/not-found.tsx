import { PageShell } from '@/components/page-shell';
import { LocaleLink } from '@/components/page-parts';
import { getDictionary } from '@/lib/i18n';
import { prefixPath, otherLocale } from '@/lib/i18n/dictionary';
import { getRequestLocale } from '@/lib/i18n/server';

export default async function NotFound() {
  const locale = await getRequestLocale();
  const dict = getDictionary(locale);
  return (
    <PageShell locale={locale} alternateHref={prefixPath(otherLocale(locale), '/')}>
      <main id="main" className="container not-found">
        <h1>{dict.notFound.code}</h1>
        <h2>{dict.notFound.title}</h2>
        <p>{dict.notFound.body}</p>
        <LocaleLink locale={locale} className="btn btn-primary" href="/">{dict.notFound.back}</LocaleLink>
      </main>
    </PageShell>
  );
}
