'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';
import { detectLocaleFromPath, prefixPath } from '@/lib/i18n/dictionary';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = detectLocaleFromPath(usePathname());
  const dict = getDictionary(locale);
  return (
    <main id="main" className="container not-found">
      <h2>{dict.error.title}</h2>
      <p>{dict.error.body}</p>
      <div className="not-found-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>{dict.error.retry}</button>
        <Link className="btn btn-outline" href={prefixPath(locale, '/')}>{dict.error.back}</Link>
      </div>
    </main>
  );
}
