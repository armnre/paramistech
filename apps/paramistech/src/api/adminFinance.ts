import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { advance, faDate, first, log, maybeRunBilling, nextInvoiceNumber, notify, requireAdmin, runBillingCycle, today } from '../server/lib';

async function markPaid(invoiceId: string, actor: string) {
  const inv = await zite.invoices.findOne({ id: invoiceId });
  if (!inv) throw new ZiteError('invoice not found', 'NOT_FOUND');
  await zite.invoices.update({ id: inv.id, record: { status: 'پرداخت‌شده', paidAt: new Date() } });
  const sid = first(inv.service);
  if (sid) {
    const s = await zite.services.findOne({ id: sid });
    if (s?.nextDueDate && inv.dueDate && s.nextDueDate <= inv.dueDate) await zite.services.update({ id: sid, record: { nextDueDate: advance(s.nextDueDate, s.billingPeriod), status: 'فعال' } });
  }
  const c = first(inv.customer);
  if (c) await notify({ audience: 'مشتری', customer: c, title: `پرداخت فاکتور ${inv.number} تأیید شد`, body: `پرداخت شما به مبلغ ${(inv.total ?? 0).toLocaleString('fa-IR')} تومان تأیید شد. رسید رسمی در پرتال در دسترس است. سپاس از همراهی شما.`, link: '/portal/invoices' });
  await log(actor, 'ثبت پرداخت فاکتور', inv.number ?? '');
}

export default createEndpoint({
  description: 'Admin finance actions: dashboard stats, billing run, invoice issuing and payment review',
  inputSchema: z.object({
    token: z.string(),
    action: z.enum(['dashboard', 'runBilling', 'issueForService', 'createInvoice', 'markPaid', 'cancelInvoice', 'reviewPayment']),
    id: z.string().optional(),
    approve: z.boolean().optional(),
    note: z.string().optional(),
    invoice: z.object({ customer: z.string(), service: z.string().optional(), dueDate: z.string(), items: z.array(z.object({ title: z.string(), desc: z.string().optional(), qty: z.number(), price: z.number() })), discount: z.number().optional(), notes: z.string().optional(), periodLabel: z.string().optional() }).optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const me = await requireAdmin(input.token, input.action === 'dashboard' ? undefined : ['مالی']);

    if (input.action === 'dashboard') {
      await maybeRunBilling();
      const q = async (query: string, params: unknown[] = []) => (await zite.sql({ query, params })).rows;
      const [money] = await q(`SELECT
        COALESCE(SUM(CASE WHEN "status"='پرداخت‌شده' AND "paidAt" >= date_trunc('month', now()) THEN "total" END),0)::float AS "monthRevenue",
        COALESCE(SUM(CASE WHEN "status" IN ('صادرشده','معوق','در انتظار تأیید') THEN "total" END),0)::float AS "outstanding",
        COUNT(*) FILTER (WHERE "status"='معوق')::int AS "overdue",
        COUNT(*) FILTER (WHERE "status" IN ('صادرشده','در انتظار تأیید'))::int AS "open"
        FROM "Invoices"`);
      const [counts] = await q(`SELECT
        (SELECT COUNT(*) FROM "Payments" WHERE "status"='در انتظار بررسی')::int AS "pendingPayments",
        (SELECT COUNT(*) FROM "Customers" WHERE "active"=true)::int AS "customers",
        (SELECT COUNT(*) FROM "Services" WHERE "status"='فعال')::int AS "activeServices",
        (SELECT COUNT(*) FROM "ProjectRequests" WHERE "status"='جدید' OR "status" IS NULL)::int AS "newRequests"`);
      const revenue = await q(`SELECT to_char(date_trunc('month', "paidAt"), 'YYYY-MM') AS "m", SUM("total")::float AS "v" FROM "Invoices"
        WHERE "status"='پرداخت‌شده' AND "paidAt" >= now() - interval '12 months' GROUP BY 1 ORDER BY 1`);
      const upcoming = await q(`SELECT s.id, MAX(s."title") AS "title", MAX(s."domain") AS "domain", MAX(s."amount")::float AS "amount", to_char(MAX(s."nextDueDate"), 'YYYY-MM-DD') AS "nextDueDate", MAX(c."name") AS "customer"
        FROM "Services" s LEFT JOIN "CustomersServices" l ON l."servicesId" = s.id LEFT JOIN "Customers" c ON c.id = l."customersId"
        WHERE s."status"='فعال' AND s."nextDueDate" <= now() + interval '30 days' GROUP BY s.id ORDER BY MAX(s."nextDueDate") LIMIT 8`);
      const activity = await q(`SELECT "action", "actor", "details", "createdAt"::text AS "createdAt" FROM "ActivityLog" ORDER BY "createdAt" DESC LIMIT 8`);
      return { ...money, ...counts, revenue, upcoming, activity };
    }

    if (input.action === 'runBilling') {
      const r = await runBillingCycle();
      await log(me.username, 'اجرای چرخه صدور فاکتور', `${r.issued} صادر، ${r.overdue} معوق`);
      return r;
    }

    if (input.action === 'issueForService') {
      const s = await zite.services.findOne({ id: input.id });
      if (!s) throw new ZiteError('service not found', 'NOT_FOUND');
      const due = s.nextDueDate ?? today();
      const number = await nextInvoiceNumber();
      const label = `${s.billingPeriod ?? 'دوره'} — سررسید ${faDate(due)}`;
      const inv = await zite.invoices.create({ record: { number, customer: first(s.customer) ?? null, service: s.id, issueDate: today(), dueDate: due, status: 'صادرشده', items: JSON.stringify([{ title: `${s.title}${s.domain ? ` (${s.domain})` : ''}`, desc: label, qty: 1, price: s.amount ?? 0 }]), discount: 0, total: s.amount ?? 0, periodLabel: label, remindersSent: 0 } });
      const c = first(s.customer);
      if (c) await notify({ audience: 'مشتری', customer: c, title: `فاکتور ${number} صادر شد`, body: `فاکتور «${s.title}» به مبلغ ${(s.amount ?? 0).toLocaleString('fa-IR')} تومان صادر شد.`, link: '/portal/invoices' });
      await log(me.username, 'صدور فاکتور', number);
      return { id: inv.id, number };
    }

    if (input.action === 'createInvoice' && input.invoice) {
      const v = input.invoice;
      const sum = v.items.reduce((a, b) => a + b.qty * b.price, 0) - (v.discount ?? 0);
      const number = await nextInvoiceNumber();
      const inv = await zite.invoices.create({ record: { number, customer: v.customer, service: v.service ?? null, issueDate: today(), dueDate: v.dueDate, status: 'صادرشده', items: JSON.stringify(v.items), discount: v.discount ?? 0, total: Math.max(0, sum), notes: v.notes ?? null, periodLabel: v.periodLabel ?? null, remindersSent: 0 } });
      await notify({ audience: 'مشتری', customer: v.customer, title: `فاکتور ${number} صادر شد`, body: `فاکتوری به مبلغ ${Math.max(0, sum).toLocaleString('fa-IR')} تومان برای شما صادر شد. مهلت پرداخت: ${faDate(v.dueDate)}`, link: '/portal/invoices' });
      await log(me.username, 'صدور فاکتور دستی', number);
      return { id: inv.id, number };
    }

    if (input.action === 'markPaid' && input.id) { await markPaid(input.id, me.username); return { ok: true }; }

    if (input.action === 'cancelInvoice' && input.id) {
      const inv = await zite.invoices.update({ id: input.id, record: { status: 'لغو' } });
      await log(me.username, 'لغو فاکتور', String(inv.fields.number ?? input.id));
      return { ok: true };
    }

    if (input.action === 'reviewPayment' && input.id) {
      const p = await zite.payments.findOne({ id: input.id });
      if (!p) throw new ZiteError('payment not found', 'NOT_FOUND');
      await zite.payments.update({ id: p.id, record: { status: input.approve ? 'تأییدشده' : 'ردشده', reviewNote: input.note ?? null, reviewedBy: me.name } });
      const invId = first(p.invoice);
      if (input.approve && invId) await markPaid(invId, me.username);
      if (!input.approve) {
        if (invId) { const inv = await zite.invoices.findOne({ id: invId }); await zite.invoices.update({ id: invId, record: { status: inv?.dueDate && inv.dueDate < today() ? 'معوق' : 'صادرشده' } }); }
        const c = first(p.customer);
        if (c) await notify({ audience: 'مشتری', customer: c, title: 'رسید پرداخت تأیید نشد', body: `رسید با کد پیگیری ${p.trackingCode} تأیید نشد.${input.note ? ` دلیل: ${input.note}` : ''} لطفاً رسید صحیح را دوباره ارسال کنید.`, link: '/portal/invoices' });
        await log(me.username, 'رد رسید پرداخت', p.trackingCode ?? '');
      }
      return { ok: true };
    }
    throw new ZiteError('bad action', 'BAD_REQUEST');
  },
});
