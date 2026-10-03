// Pure helpers: message templates and notification configuration. No network, no secrets in output.
// Staff-facing text is always Persian; it states which language the visitor used.
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/dictionary';

export type LeadSummary = {
  id: number;
  locale: Locale;
  name: string;
  projectType: string;
  budget: string;
  timeline: string;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[character] ?? character;
  });
}

export function leadAdminUrl(lead: Pick<LeadSummary, 'id'>, siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '') {
  return `${siteUrl.replace(/\/+$/, '')}/admin/leads/${lead.id}`;
}

export function parseNotifyEmails(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

/** Persian name of the language the visitor used (shown to staff). */
export function languageName(locale: Locale) {
  return getDictionary(locale).lead.languageLine.replace(/^[^:]+:\s*/, '');
}

export function buildLeadEmail(lead: LeadSummary, url: string) {
  const subject = `درخواست پروژه جدید: ${lead.name}`;
  const rows: Array<[string, string]> = [
    ['نام', lead.name],
    ['نوع پروژه', lead.projectType],
    ['بودجه', lead.budget],
    ['زمان‌بندی', lead.timeline],
    ['زبان فرم', languageName(lead.locale)],
  ];
  const text = [
    'یک درخواست پروژه جدید ثبت شد.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `مشاهده در پنل مدیریت: ${url}`,
  ].join('\n');
  const html = `<!doctype html>
<html lang="fa" dir="rtl"><body style="font-family:Tahoma,Arial,sans-serif;line-height:1.9;color:#0b1f1c">
<h2 style="margin:0 0 12px">یک درخواست پروژه جدید ثبت شد</h2>
<table style="border-collapse:collapse">
${rows.map(([label, value]) => `<tr><td style="padding:4px 0 4px 16px;color:#5b6b67">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('\n')}
</table>
<p><a href="${escapeHtml(url)}" style="color:#0f766e">مشاهده در پنل مدیریت</a></p>
</body></html>`;
  return { subject, text, html };
}

/** Telegram only gets a pointer: no email, phone or the free-text details of the lead. */
export function buildTelegramText(lead: LeadSummary, url: string) {
  return ['درخواست پروژه جدید', `نام: ${lead.name}`, `نوع پروژه: ${lead.projectType}`, getDictionary(lead.locale).lead.languageLine, url].join('\n');
}

export function notificationStatus(env: Record<string, string | undefined> = process.env) {
  return {
    email: Boolean(env.SMTP_HOST && env.SMTP_FROM && parseNotifyEmails(env.NOTIFY_EMAILS).length > 0),
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
  };
}
