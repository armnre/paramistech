import 'server-only';
import nodemailer from 'nodemailer';
import {
  buildLeadEmail,
  buildTelegramText,
  leadAdminUrl,
  notificationStatus,
  parseNotifyEmails,
  type LeadSummary,
} from '@/lib/notify-content';

async function sendEmail(lead: LeadSummary, url: string) {
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
  const message = buildLeadEmail(lead, url);
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: parseNotifyEmails(process.env.NOTIFY_EMAILS),
    subject: message.subject,
    text: message.text,
    html: message.html,
    textEncoding: 'base64',
  });
}

async function sendTelegram(lead: LeadSummary, url: string) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: buildTelegramText(lead, url) }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Telegram responded with status ${response.status}`);
}

/**
 * Runs after the lead is stored (and after the response is sent). Each channel is independent;
 * failures are logged and never affect the saved lead. Secrets are never logged.
 */
export async function sendLeadNotifications(lead: LeadSummary) {
  const status = notificationStatus();
  const url = leadAdminUrl(lead);
  const jobs: Array<Promise<void>> = [];
  if (status.email) jobs.push(sendEmail(lead, url).then(() => console.info(`Lead ${lead.id}: email notification sent`)));
  if (status.telegram) jobs.push(sendTelegram(lead, url).then(() => console.info(`Lead ${lead.id}: telegram notification sent`)));

  const channels = [status.email && 'email', status.telegram && 'telegram'].filter(Boolean);
  const results = await Promise.allSettled(jobs);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const reason = result.reason instanceof Error ? result.reason.message : 'unknown error';
      console.error(`Lead ${lead.id}: ${channels[index]} notification failed: ${reason}`);
    }
  });
}
