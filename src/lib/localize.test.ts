import { describe, expect, it } from 'vitest';
import {
  artVariantFor,
  localizeFaq,
  localizePost,
  localizeProject,
  localizeService,
  localizeSettings,
  postHasEnglish,
  projectHasEnglish,
  serviceHasEnglish,
} from './localize';

// Rows are cast: only the fields the localisation rules read are filled in.
const now = new Date('2026-01-01T00:00:00Z');
const service = (extra: object = {}) =>
  ({ id: 1, slug: 'enterprise-software', slugEn: null, title: 'عنوان', titleEn: null, shortDescription: 'توضیح', shortDescriptionEn: null, bodyMd: 'متن', bodyMdEn: null, icon: 'building', metaTitle: '', metaDescription: '', metaTitleEn: null, metaDescriptionEn: null, updatedAt: now, ...extra }) as never;
const project = (extra: object = {}) =>
  ({ id: 1, slug: 'smart-finance', slugEn: null, title: 'عنوان', titleEn: null, category: 'فین‌تک', categoryEn: null, year: 'نمونهٔ مفهومی', summary: 'خلاصه', summaryEn: null, challengeMd: 'چالش', challengeMdEn: null, solutionMd: '', solutionMdEn: null, resultsMd: '', resultsMdEn: null, techTags: ['Next.js'], isPlaceholder: false, metaTitle: '', metaDescription: '', metaTitleEn: null, metaDescriptionEn: null, updatedAt: now, ...extra }) as never;
const post = (extra: object = {}) =>
  ({ id: 1, slug: 'hello', slugEn: null, title: 'سلام', titleEn: null, excerpt: 'خلاصه', excerptEn: null, bodyMd: 'متن', bodyMdEn: null, author: 'A', publishedAt: now, noindex: false, metaTitle: '', metaDescription: '', metaTitleEn: null, metaDescriptionEn: null, updatedAt: now, ...extra }) as never;

describe('English visibility rules', () => {
  it('hides a service in English until title, description and body all exist', () => {
    expect(localizeService(service(), 'en')).toBeNull();
    expect(localizeService(service({ titleEn: 'Title' }), 'en')).toBeNull();
    expect(localizeService(service({ titleEn: 'Title', shortDescriptionEn: 'Desc' }), 'en')).toBeNull();
    expect(localizeService(service({ titleEn: 'Title', shortDescriptionEn: 'Desc', bodyMdEn: '   ' }), 'en')).toBeNull();
    const full = service({ titleEn: 'Title', shortDescriptionEn: 'Desc', bodyMdEn: 'Body' });
    expect(serviceHasEnglish(full)).toBe(true);
    expect(localizeService(full, 'en')?.title).toBe('Title');
  });

  it('always shows the Persian version and reports whether English exists', () => {
    const fa = localizeService(service(), 'fa');
    expect(fa?.title).toBe('عنوان');
    expect(fa?.slugs).toEqual({ fa: 'enterprise-software', en: null });
    const both = localizeService(service({ titleEn: 'T', shortDescriptionEn: 'D', bodyMdEn: 'B', slugEn: 'enterprise' }), 'fa');
    expect(both?.slugs).toEqual({ fa: 'enterprise-software', en: 'enterprise' });
  });

  it('uses slug_en for the English URL and falls back to the Persian slug', () => {
    const base = { titleEn: 'T', shortDescriptionEn: 'D', bodyMdEn: 'B' };
    expect(localizeService(service({ ...base, slugEn: 'custom' }), 'en')?.slug).toBe('custom');
    expect(localizeService(service(base), 'en')?.slug).toBe('enterprise-software');
  });

  it('requires a title, summary and at least one body section for projects', () => {
    expect(projectHasEnglish(project({ titleEn: 'T', summaryEn: 'S' }))).toBe(false);
    expect(projectHasEnglish(project({ titleEn: 'T', summaryEn: 'S', solutionMdEn: 'x' }))).toBe(true);
    expect(localizeProject(project({ titleEn: 'T', summaryEn: 'S' }), null, 'en')).toBeNull();
  });

  it('never leaks Persian-only copy into English projects', () => {
    const view = localizeProject(project({ titleEn: 'T', summaryEn: 'S', challengeMdEn: 'C' }), null, 'en');
    expect(view?.category).toBeNull();
    expect(view?.year).toBeNull();
    const withData = localizeProject(project({ titleEn: 'T', summaryEn: 'S', challengeMdEn: 'C', categoryEn: 'Fintech', year: '2025' }), null, 'en');
    expect(withData?.category).toBe('Fintech');
    expect(withData?.year).toBe('2025');
    expect(localizeProject(project(), null, 'fa')?.year).toBe('نمونهٔ مفهومی');
  });

  it('picks the illustration from the Persian category in both languages', () => {
    expect(artVariantFor('سلامت')).toBe('health');
    expect(artVariantFor('فروشگاهی')).toBe('store');
    expect(artVariantFor('فین‌تک')).toBe('finance');
    const en = localizeProject(project({ category: 'سلامت', titleEn: 'T', summaryEn: 'S', challengeMdEn: 'C' }), null, 'en');
    expect(en?.art).toBe('health');
  });

  it('requires an English title and body for posts', () => {
    expect(postHasEnglish(post({ titleEn: 'T' }))).toBe(false);
    expect(localizePost(post({ bodyMdEn: 'B' }), null, 'en')).toBeNull();
    const view = localizePost(post({ titleEn: 'T', bodyMdEn: 'B', excerptEn: 'E' }), null, 'en');
    expect(view?.title).toBe('T');
    expect(view?.excerpt).toBe('E');
  });

  it('omits FAQs without both English question and answer', () => {
    const faq = (extra: object) => ({ id: 3, question: 'س', answer: 'ج', questionEn: null, answerEn: null, ...extra }) as never;
    expect(localizeFaq(faq({}), 'fa')).toEqual({ id: 3, question: 'س', answer: 'ج' });
    expect(localizeFaq(faq({ questionEn: 'Q' }), 'en')).toBeNull();
    expect(localizeFaq(faq({ questionEn: 'Q', answerEn: 'A' }), 'en')).toEqual({ id: 3, question: 'Q', answer: 'A' });
  });

  it('shows the Persian address only on Persian pages', () => {
    const row = { contactEmail: 'a@b.c', contactPhone: '1', contactPhoneHref: '+1', contactAddress: 'تهران', contactAddressEn: null, socials: [] } as never;
    expect(localizeSettings(row, 'fa').address).toBe('تهران');
    expect(localizeSettings(row, 'en').address).toBe('');
    expect(localizeSettings({ ...(row as object), contactAddressEn: 'Tehran' } as never, 'en').address).toBe('Tehran');
    expect(localizeSettings(row, 'en').email).toBe('a@b.c');
    const persianPhone = { ...(row as object), contactPhone: '+۹۸ ۲۱ ۰۰۰۰' } as never;
    expect(localizeSettings(persianPhone, 'en').phone).toBe('+98 21 0000');
    expect(localizeSettings(persianPhone, 'fa').phone).toBe('+۹۸ ۲۱ ۰۰۰۰');
  });
});
