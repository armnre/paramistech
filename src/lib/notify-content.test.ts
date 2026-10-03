import { describe, expect, it } from 'vitest';
import {
  buildLeadEmail,
  buildTelegramText,
  escapeHtml,
  leadAdminUrl,
  notificationStatus,
  parseNotifyEmails,
} from './notify-content';

const lead = { id: 7, locale: 'fa' as const, name: 'آیدا <b>رضایی</b>', projectType: 'اپلیکیشن موبایل', budget: 'هنوز مشخص نیست', timeline: '۳ تا ۶ ماه' };
const url = leadAdminUrl(lead, 'https://paramistech.example/');

describe('lead notifications', () => {
  it('links to the lead in the admin panel', () => {
    expect(url).toBe('https://paramistech.example/admin/leads/7');
  });

  it('builds a Persian email with the key facts and escapes HTML', () => {
    const email = buildLeadEmail(lead, url);
    expect(email.subject).toContain('درخواست پروژه جدید');
    for (const part of [lead.projectType, lead.budget, lead.timeline, url]) {
      expect(email.text).toContain(part);
      expect(email.html).toContain(escapeHtml(part));
    }
    expect(email.html).not.toContain('<b>رضایی</b>');
    expect(email.html).toContain('&lt;b&gt;');
  });

  it('never puts free-text details, email or phone into the Telegram message', () => {
    const text = buildTelegramText({ ...lead, details: 'متن خصوصی', email: 'x@y.z', phone: '0912' } as typeof lead, url);
    expect(text).not.toContain('متن خصوصی');
    expect(text).not.toContain('x@y.z');
    expect(text).not.toContain('0912');
    expect(text).toContain(url);
  });

  it('parses and validates NOTIFY_EMAILS', () => {
    expect(parseNotifyEmails(' a@x.com, bad, b@y.org ,')).toEqual(['a@x.com', 'b@y.org']);
    expect(parseNotifyEmails(undefined)).toEqual([]);
  });

  it('reports configuration as booleans only', () => {
    expect(notificationStatus({})).toEqual({ email: false, telegram: false });
    expect(
      notificationStatus({ SMTP_HOST: 'h', SMTP_FROM: 'a@b.c', NOTIFY_EMAILS: 'x@y.z', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' }),
    ).toEqual({ email: true, telegram: true });
    expect(notificationStatus({ SMTP_HOST: 'h', SMTP_FROM: 'a@b.c', NOTIFY_EMAILS: 'nope' }).email).toBe(false);
  });

  it('states the visitor language for staff, in Persian, for both locales', () => {
    const fa = buildLeadEmail({ ...lead, locale: 'fa' }, url);
    const en = buildLeadEmail({ ...lead, locale: 'en' }, url);
    expect(fa.text).toContain('زبان فرم: فارسی');
    expect(en.text).toContain('زبان فرم: انگلیسی');
    expect(en.html).toContain('انگلیسی');
    expect(buildTelegramText({ ...lead, locale: 'en' }, url)).toContain('زبان فرم: انگلیسی');
    expect(buildTelegramText({ ...lead, locale: 'fa' }, url)).toContain('زبان فرم: فارسی');
  });
});
