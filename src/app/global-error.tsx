'use client';

import { getDictionary } from '@/lib/i18n';
import { detectLocaleFromPath, localeHtml, prefixPath } from '@/lib/i18n/dictionary';

// Rendered when the root layout itself fails, so it supplies its own <html> with the right lang and dir.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = detectLocaleFromPath(typeof window === 'undefined' ? '/' : window.location.pathname);
  const dict = getDictionary(locale);
  const { lang, dir } = localeHtml[locale];
  return (
    <html lang={lang} dir={dir}>
      <body style={{ fontFamily: 'sans-serif', background: '#fafaf7', color: '#0b1f1c', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, textAlign: 'center' }}>
        <main>
          <h1>{dict.error.title}</h1>
          <p>{dict.error.body}</p>
          <button type="button" onClick={reset} style={{ padding: '10px 24px', borderRadius: 999, border: 0, background: '#0f766e', color: '#fff', cursor: 'pointer' }}>{dict.error.retry}</button>
          {' '}
          <a href={prefixPath(locale, '/')} style={{ color: '#0f766e' }}>{dict.error.back}</a>
        </main>
      </body>
    </html>
  );
}
