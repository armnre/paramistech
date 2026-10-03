import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/lib/i18n/dictionary';

/** "Forward" points left in RTL and right in LTR; icons are chosen here so layouts need no direction hacks. */
export function arrowsFor(locale: Locale) {
  return locale === 'fa'
    ? { Forward: ArrowLeft, Back: ArrowRight, ForwardUp: ArrowUpLeft }
    : { Forward: ArrowRight, Back: ArrowLeft, ForwardUp: ArrowUpRight };
}
