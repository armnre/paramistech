/** Shrinks long titles so they stay within three lines on the 1200x630 card. */
export function ogTitleSize(title: string) {
  const length = [...title].length;
  if (length <= 28) return 92;
  if (length <= 48) return 74;
  if (length <= 80) return 58;
  return 46;
}

export function ogTitle(title: string, max = 110) {
  const characters = [...title.trim()];
  return characters.length > max ? `${characters.slice(0, max - 1).join('')}…` : title.trim();
}

export function formatDate(date: Date | null | undefined, locale: 'fa' | 'en') {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { dateStyle: 'long' }).format(date);
  } catch {
    return '';
  }
}
