const persian: Record<string, string> = {
  آ: 'a', ا: 'a', ب: 'b', پ: 'p', ت: 't', ث: 's', ج: 'j', چ: 'ch', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'z', ر: 'r', ز: 'z', ژ: 'zh', س: 's', ش: 'sh', ص: 's', ض: 'z', ط: 't',
  ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ک: 'k', گ: 'g', ل: 'l', م: 'm', ن: 'n',
  و: 'v', ه: 'h', ی: 'y', ئ: 'y', ء: '', '‌': '-',
};

export function slugify(value: string) {
  const transliterated = [...value.trim()].map((character) => persian[character] ?? character).join('');
  const slug = transliterated
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'item';
}

export function headingId(value: string) {
  const id = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .slice(0, 80);
  return id || 'section';
}
