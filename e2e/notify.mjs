// Verifies lead -> DB -> email notification using the local SMTP sink (see scripts/smtp-sink.mjs).
// Run through /tmp/run-e2e.sh style harness or manually with SMTP_* pointing at the sink.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
const sinkFile = process.env.SMTP_SINK_FILE || '/tmp/mail-sink.log';
const name = `اعلان آزمایشی ${Date.now()}`;
const secretDetails = 'متن-خصوصی-که-نباید-در-اعلان-باشد';

const response = await fetch(`${baseUrl}/api/leads`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectType: 'هوش مصنوعی و داده',
    budget: '۱۰۰ تا ۳۰۰ میلیون تومان',
    timeline: 'کمتر از ۳ ماه',
    name,
    email: 'notify@example.com',
    phone: '09120000001',
    details: `${secretDetails} و توضیحات کافی برای اعتبارسنجی فرم.`,
    consent: true,
    locale: 'en',
  }),
});
assert.equal(response.status, 201, `lead submission returned ${response.status}`);

let mail = '';
for (let attempt = 0; attempt < 20 && !mail.includes(name); attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (existsSync(sinkFile)) mail = readFileSync(sinkFile, 'utf8');
}
assert.ok(mail.includes(name), 'notification email was not delivered to the SMTP sink');
assert.ok(mail.includes('SUBJECT: درخواست پروژه جدید'), 'email subject is missing');
assert.ok(mail.includes('/admin/leads/'), 'email must link to the lead in the admin panel');
assert.ok(mail.includes('زبان فرم: انگلیسی'), 'staff email states the visitor language (English) in Persian');
assert.ok(!mail.includes(secretDetails), 'free-text details must not be sent in the notification');
console.log('NOTIFY PASSED: lead stored and email delivered without the private details');
