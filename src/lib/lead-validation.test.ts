import { describe, expect, it } from 'vitest';
import { leadSchema } from './lead-validation';

const valid = {
  projectType: 'اپلیکیشن موبایل',
  budget: 'هنوز مشخص نیست',
  timeline: '۳ تا ۶ ماه',
  name: 'آیدا رضایی',
  email: 'aida@example.com',
  phone: '09120000000',
  details: 'این یک توضیح آزمایشی برای درخواست پروژه است.',
  consent: true,
};

describe('lead validation', () => {
  it('accepts a complete consented inquiry', () => {
    expect(leadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing consent and short details', () => {
    expect(leadSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, details: 'کوتاه' }).success).toBe(false);
  });
});

describe('lead locale', () => {
  const base = {
    projectType: 'Mobile app',
    budget: 'Not decided yet',
    timeline: 'Under 3 months',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+44 20 7946 0000',
    details: 'We would like a mobile app for our clinic network.',
    consent: true,
  };

  it('accepts fa and en and treats a missing locale as valid', () => {
    expect(leadSchema.safeParse({ ...base, locale: 'en' }).success).toBe(true);
    expect(leadSchema.safeParse({ ...base, locale: 'fa' }).success).toBe(true);
    expect(leadSchema.safeParse(base).success).toBe(true);
  });

  it('rejects unknown locales', () => {
    expect(leadSchema.safeParse({ ...base, locale: 'de' }).success).toBe(false);
  });
});
