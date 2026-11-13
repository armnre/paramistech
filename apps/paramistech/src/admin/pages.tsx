/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { FilePlus2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { StatusBadge } from '../components/StatusBadge';
import { card, daysUntil, first, jDate, jDateTime, num, toman } from '../lib/format';
import { CrudPage } from './CrudPage';
import { DataTable, PageHead } from './kit';
import { errMsg, useApi, useList } from './session';

export function Customers() {
  return (
    <CrudPage table="customers" title="مشتریان" desc="برای هر مشتری نام کاربری و رمز بسازید و به او بدهید تا وارد پرتال مشتریان شود" label="مشتری" defaults={{ active: true }}
      searchKeys={['name', 'contactName', 'username', 'email', 'phone']}
      cols={[
        { key: 'name', label: 'نام / شرکت', render: (r) => <div><p className="font-bold">{r.name}</p><p className="text-xs text-muted-foreground">{r.contactName}</p></div> },
        { key: 'username', label: 'نام کاربری پرتال', render: (r) => <span dir="ltr">{r.username || '—'}</span> },
        { key: 'phone', label: 'تلفن', hideSm: true, render: (r) => <span dir="ltr">{r.phone || '—'}</span> },
        { key: 'services', label: 'سرویس‌ها', hideSm: true, render: (r) => num(Array.isArray(r.services) ? r.services.length : r.services ? 1 : 0) },
        { key: 'active', label: 'وضعیت', render: (r) => <StatusBadge s={r.active ? 'فعال' : 'معلق'} /> },
      ]}
      fields={[
        { key: 'name', label: 'نام کسب‌وکار / مشتری', required: true },
        { key: 'contactName', label: 'نام رابط' },
        { key: 'username', label: 'نام کاربری پرتال', ltr: true, required: true },
        { key: 'password', label: 'رمز عبور پرتال', type: 'password', hint: 'برای مشتری جدید الزامی (حداقل ۸ کاراکتر)؛ در ویرایش خالی بگذارید تا تغییر نکند' },
        { key: 'email', label: 'ایمیل', type: 'email' },
        { key: 'phone', label: 'تلفن', ltr: true },
        { key: 'nationalId', label: 'شناسه ملی / کد ملی', ltr: true },
        { key: 'active', label: 'دسترسی فعال به پرتال', type: 'checkbox' },
        { key: 'address', label: 'آدرس', type: 'textarea' },
        { key: 'notes', label: 'یادداشت داخلی', type: 'textarea' },
      ]} />
  );
}

function IssueBtn({ id }: { id: string }) {
  const api = useApi();
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={busy} onClick={async (e) => { e.stopPropagation(); setBusy(true); try { const r = await api.finance({ action: 'issueForService', id }); toast.success(`فاکتور ${r.number} صادر شد`); } catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); } }}>
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FilePlus2 className="h-3 w-3" />}صدور فاکتور
    </Button>
  );
}

export function Services() {
  const { rows: customers } = useList('customers');
  const cname = useMemo(() => Object.fromEntries((customers ?? []).map((c) => [c.id, c.name])), [customers]);
  return (
    <CrudPage table="services" title="سرویس‌ها و هاست" desc="سرویس‌های دوره‌ای؛ فاکتور تمدید ۳ روز قبل از سررسید صادر می‌شود" label="سرویس"
      defaults={{ kind: 'هاست', billingPeriod: 'ماهانه', status: 'فعال', autoRenew: true }} tabs={['فعال', 'معلق', 'لغو']} tabKey="status"
      searchKeys={['title', 'domain']}
      cols={[
        { key: 'title', label: 'سرویس', render: (r) => <div><p className="font-bold">{r.title}</p><p className="text-xs text-muted-foreground" dir="ltr">{r.domain}</p></div> },
        { key: 'customer', label: 'مشتری', render: (r) => cname[first(r.customer) ?? ''] ?? '—' },
        { key: 'amount', label: 'مبلغ دوره', hideSm: true, render: (r) => <span className="tabular-nums">{toman(r.amount)} <span className="text-xs text-muted-foreground">/ {r.billingPeriod}</span></span> },
        { key: 'nextDueDate', label: 'سررسید بعدی', render: (r) => { const n = daysUntil(r.nextDueDate); return <span className={n !== null && n <= 3 ? 'font-bold text-destructive' : ''}>{jDate(r.nextDueDate)}</span>; } },
        { key: 'status', label: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> },
        { key: '_i', label: '', render: (r) => <IssueBtn id={r.id} /> },
      ]}
      fields={[
        { key: 'title', label: 'عنوان سرویس', required: true, hint: 'مثلاً: هاست لینوکس — پلن حرفه‌ای' },
        { key: 'customer', label: 'مشتری', type: 'link', table: 'customers', required: true },
        { key: 'kind', label: 'نوع', type: 'select', options: ['هاست', 'دامنه', 'پشتیبانی', 'سرور', 'سایر'] },
        { key: 'domain', label: 'دامنه', ltr: true, hint: 'مثلاً kharideamn.com' },
        { key: 'amount', label: 'مبلغ هر دوره (تومان)', type: 'number', required: true },
        { key: 'billingPeriod', label: 'دوره پرداخت', type: 'select', options: ['ماهانه', 'سه‌ماهه', 'شش‌ماهه', 'سالانه'] },
        { key: 'startDate', label: 'تاریخ شروع', type: 'date' },
        { key: 'nextDueDate', label: 'سررسید بعدی', type: 'date', required: true },
        { key: 'status', label: 'وضعیت', type: 'select', options: ['فعال', 'معلق', 'لغو'] },
        { key: 'autoRenew', label: 'صدور خودکار فاکتور تمدید', type: 'checkbox' },
        { key: 'notes', label: 'یادداشت', type: 'textarea' },
      ]} />
  );
}

export function Banks() {
  return (
    <CrudPage table="bankAccounts" title="حساب‌های بانکی" desc="حساب‌های فعال روی فاکتورها برای واریز نمایش داده می‌شوند" label="حساب" defaults={{ active: true }} searchKeys={['title', 'holderName', 'bankName']}
      cols={[
        { key: 'title', label: 'عنوان', render: (r) => <span className="font-bold">{r.title}</span> },
        { key: 'cardNumber', label: 'شماره کارت', render: (r) => <span dir="ltr" className="tabular-nums">{card(r.cardNumber)}</span> },
        { key: 'holderName', label: 'صاحب حساب', hideSm: true }, { key: 'bankName', label: 'بانک', hideSm: true },
        { key: 'active', label: 'وضعیت', render: (r) => <StatusBadge s={r.active ? 'فعال' : 'معلق'} /> },
      ]}
      fields={[
        { key: 'title', label: 'عنوان', required: true }, { key: 'bankName', label: 'نام بانک' },
        { key: 'cardNumber', label: 'شماره کارت ۱۶ رقمی', ltr: true, required: true }, { key: 'holderName', label: 'نام صاحب حساب', required: true },
        { key: 'sheba', label: 'شماره شبا (بدون IR)', ltr: true }, { key: 'active', label: 'نمایش روی فاکتورها', type: 'checkbox' },
      ]} />
  );
}

export function Requests() {
  return (
    <CrudPage table="projectRequests" title="درخواست‌های پروژه" desc="درخواست‌های ثبت‌شده از فرم سایت" label="درخواست" canCreate={false} tabs={['جدید', 'تماس گرفته شد', 'موفق', 'ناموفق']} tabKey="status"
      searchKeys={['fullName', 'phone', 'email', 'company', 'details']}
      toForm={(r) => ({ ...r, status: r.status || 'جدید' })}
      cols={[
        { key: 'fullName', label: 'نام', render: (r) => <div><p className="font-bold">{r.fullName}</p><p className="text-xs text-muted-foreground">{r.company}</p></div> },
        { key: 'phone', label: 'تماس', render: (r) => <a dir="ltr" href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline">{r.phone}</a> },
        { key: 'projectType', label: 'نوع', hideSm: true },
        { key: 'budget', label: 'بودجه', hideSm: true },
        { key: 'submittedAt', label: 'تاریخ', hideSm: true, render: (r) => jDateTime(r.submittedAt) },
        { key: 'status', label: 'وضعیت', render: (r) => <StatusBadge s={r.status || 'جدید'} /> },
      ]}
      fields={[
        { key: 'status', label: 'وضعیت پیگیری', type: 'select', options: ['جدید', 'تماس گرفته شد', 'موفق', 'ناموفق'] },
        { key: 'fullName', label: 'نام' }, { key: 'phone', label: 'تلفن', ltr: true }, { key: 'email', label: 'ایمیل', type: 'email' }, { key: 'company', label: 'شرکت' },
        { key: 'projectType', label: 'نوع پروژه' }, { key: 'budget', label: 'بودجه' }, { key: 'timeline', label: 'زمان‌بندی' },
        { key: 'estimatedCost', label: 'برآورد ماشین‌حساب (میلیون تومان)', type: 'number' },
        { key: 'details', label: 'توضیحات', type: 'textarea' },
      ]} />
  );
}

export function Admins() {
  return (
    <CrudPage table="admins" title="مدیران و نقش‌ها" desc="مدیر کل: دسترسی کامل · مالی: فاکتور، پرداخت، مشتری و سرویس · محتوا: محتوای سایت" label="مدیر" defaults={{ role: 'مالی', active: true }}
      searchKeys={['username', 'displayName']}
      cols={[
        { key: 'displayName', label: 'نام', render: (r) => <div><p className="font-bold">{r.displayName}</p><p className="text-xs text-muted-foreground" dir="ltr">@{r.username}</p></div> },
        { key: 'role', label: 'نقش', render: (r) => <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{r.role}</span> },
        { key: 'lastLoginAt', label: 'آخرین ورود', hideSm: true, render: (r) => jDateTime(r.lastLoginAt) },
        { key: 'active', label: 'وضعیت', render: (r) => <StatusBadge s={r.active ? 'فعال' : 'معلق'} /> },
      ]}
      fields={[
        { key: 'displayName', label: 'نام نمایشی', required: true }, { key: 'username', label: 'نام‌کاربری', ltr: true, required: true },
        { key: 'password', label: 'رمز عبور', type: 'password', hint: 'برای مدیر جدید الزامی؛ در ویرایش، خالی بگذارید تا تغییر نکند' },
        { key: 'role', label: 'نقش', type: 'select', options: ['مدیر کل', 'مالی', 'محتوا'] }, { key: 'active', label: 'فعال', type: 'checkbox' },
      ]} />
  );
}

export function Activity() {
  const { rows } = useList('activityLog');
  return (
    <>
      <PageHead title="لاگ فعالیت‌ها" desc="ثبت همه تغییرات انجام‌شده توسط مدیران" />
      <DataTable rows={rows} pageSize={25} searchKeys={['action', 'actor', 'details']} cols={[
        { key: 'createdAt', label: 'زمان', render: (r) => <span className="whitespace-nowrap text-muted-foreground">{jDateTime(r.createdAt)}</span> },
        { key: 'actor', label: 'مدیر', render: (r) => <span className="font-bold" dir="ltr">{r.actor}</span> },
        { key: 'action', label: 'عملیات' },
        { key: 'details', label: 'جزئیات', hideSm: true, render: (r) => <span className="text-muted-foreground">{r.details || '—'}</span> },
      ]} />
    </>
  );
}
