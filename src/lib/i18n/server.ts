import 'server-only';
import { headers } from 'next/headers';
import { detectLocaleFromPath, isLocale, type Locale } from './dictionary';

/** Locale of the current request, set by src/proxy.ts from the URL (/en/... is English). */
export async function getRequestLocale(): Promise<Locale> {
  const headerStore = await headers();
  const fromHeader = headerStore.get('x-locale');
  if (fromHeader && isLocale(fromHeader)) return fromHeader;
  return detectLocaleFromPath(headerStore.get('x-pathname') ?? '/');
}
