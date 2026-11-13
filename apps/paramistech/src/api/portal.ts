import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { first, hashPassword, maybeRunBilling, notify, requireCustomer, signCustomerToken, verifyPassword } from '../server/lib';

export default createEndpoint({
  description: 'Customer portal: own services, invoices, notifications and payment receipts',
  inputSchema: z.object({
    action: z.enum(['login', 'me', 'submitPayment', 'markRead', 'changePassword']),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    newPassword: z.string().optional(),
    invoiceId: z.string().optional(),
    trackingCode: z.string().optional(),
    paidDate: z.string().optional(),
    payerCard: z.string().optional(),
    receiptUrl: z.string().optional(),
    receiptName: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    if (input.action === 'login') {
      const bad = new ZiteError({ code: 'UNAUTHORIZED', message: 'bad login', userFacingMessage: 'نام کاربری یا رمز عبور اشتباه است.' });
      const username = (input.username ?? '').trim().toLowerCase();
      if (!username || !input.password) throw bad;
      const { records } = await zite.customers.findAll({ filters: { username }, limit: 1 });
      const u = records[0];
      if (!u?.passwordHash || !(await verifyPassword(input.password, u.passwordHash))) throw bad;
      if (!u.active) throw new ZiteError({ code: 'FORBIDDEN', message: 'inactive', userFacingMessage: 'دسترسی حساب شما غیرفعال است. با پشتیبانی تماس بگیرید.' });
      await zite.customers.update({ id: u.id, record: { lastLoginAt: new Date().toISOString() } });
      return { token: await signCustomerToken(u.id) };
    }
    const c = await requireCustomer(input.token);

    if (input.action === 'changePassword') {
      if (!c.passwordHash || !(await verifyPassword(input.password ?? '', c.passwordHash))) throw new ZiteError({ code: 'BAD_REQUEST', message: 'bad pw', userFacingMessage: 'رمز فعلی اشتباه است.' });
      if ((input.newPassword ?? '').length < 8) throw new ZiteError({ code: 'BAD_REQUEST', message: 'short', userFacingMessage: 'رمز جدید حداقل ۸ کاراکتر باشد.' });
      await zite.customers.update({ id: c.id, record: { passwordHash: await hashPassword(input.newPassword!) } });
      return { ok: true };
    }

    if (input.action === 'markRead') {
      const { records } = await zite.notifications.findAll({ filters: { customer: c.id, read: false }, limit: 200 });
      for (const n of records) await zite.notifications.update({ id: n.id, record: { read: true } });
      return { ok: true };
    }

    if (input.action === 'submitPayment') {
      const inv = input.invoiceId ? await zite.invoices.findOne({ id: input.invoiceId }) : undefined;
      if (!inv || first(inv.customer) !== c.id) throw new ZiteError({ code: 'NOT_FOUND', message: 'invoice', userFacingMessage: 'فاکتور پیدا نشد.' });
      if (['پرداخت‌شده', 'لغو'].includes(inv.status ?? '')) throw new ZiteError({ code: 'BAD_REQUEST', message: 'closed', userFacingMessage: 'این فاکتور قابل پرداخت نیست.' });
      const code = (input.trackingCode ?? '').trim();
      if (code.length < 4 || !input.receiptUrl) throw new ZiteError({ code: 'BAD_REQUEST', message: 'missing', userFacingMessage: 'کد پیگیری و تصویر رسید الزامی است.' });
      await zite.payments.create({ record: { trackingCode: code, invoice: inv.id, customer: c.id, amount: inv.total ?? 0, paidDate: input.paidDate ?? null, receipt: [{ url: input.receiptUrl, filename: input.receiptName || 'receipt.jpg' }], payerCard: input.payerCard ?? null, status: 'در انتظار بررسی' } });
      await zite.invoices.update({ id: inv.id, record: { status: 'در انتظار تأیید' } });
      await notify({ audience: 'ادمین', title: `رسید جدید برای فاکتور ${inv.number}`, body: `${c.name} رسید پرداخت ${(inv.total ?? 0).toLocaleString('fa-IR')} تومان را ارسال کرد.`, link: '/admin/payments' });
      return { ok: true };
    }

    await maybeRunBilling();
    const [{ records: services }, { records: invoices }, { records: notifications }, { records: banks }, { records: payments }] = await Promise.all([
      zite.services.findAll({ filters: { customer: c.id }, limit: 100 }),
      zite.invoices.findAll({ filters: { customer: c.id }, sort: [{ field: 'createdAt', direction: 'desc' }], limit: 200 }),
      zite.notifications.findAll({ filters: { customer: c.id }, sort: [{ field: 'createdAt', direction: 'desc' }], limit: 50 }),
      zite.bankAccounts.findAll({ filters: { active: true }, limit: 10 }),
      zite.payments.findAll({ filters: { customer: c.id }, sort: [{ field: 'createdAt', direction: 'desc' }], limit: 200 }),
    ]);
    const { records: settings } = await zite.siteSettings.findAll({ limit: 200 });
    const company = Object.fromEntries(settings.filter((s) => s.key?.startsWith('company.')).map((s) => [s.key!.slice(8), s.value ?? '']));
    return {
      linked: true,
      customer: { id: c.id, username: c.username, name: c.name, contactName: c.contactName, email: c.email, phone: c.phone, address: c.address, nationalId: c.nationalId },
      services: services.filter((s) => s.status !== 'لغو').map((s) => ({ id: s.id, title: s.title, kind: s.kind, domain: s.domain, amount: s.amount, billingPeriod: s.billingPeriod, nextDueDate: s.nextDueDate, status: s.status })),
      invoices: invoices.filter((i) => i.status !== 'پیش‌نویس').map((i) => ({ id: i.id, number: i.number, issueDate: i.issueDate, dueDate: i.dueDate, status: i.status, items: i.items, discount: i.discount, total: i.total, periodLabel: i.periodLabel, notes: i.notes, paidAt: i.paidAt })),
      payments: payments.map((p) => ({ id: p.id, invoice: first(p.invoice), trackingCode: p.trackingCode, amount: p.amount, status: p.status, reviewNote: p.reviewNote, createdAt: p.createdAt })),
      notifications: notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, read: n.read, createdAt: n.createdAt })),
      banks: banks.map((b) => ({ title: b.title, holderName: b.holderName, cardNumber: b.cardNumber, sheba: b.sheba, bankName: b.bankName })),
      company,
    };
  },
});
