/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Label } from '@project/components/ui/label';
import { cn } from '@project/components/lib/utils';
import { num } from '../lib/format';
import { CrudPage } from './CrudPage';
import { FieldInput, PageHead, Panel, type Field } from './kit';
import { errMsg, useApi, useList } from './session';

type KindCfg = { kind: string; label: string; fields: Field[]; sub?: string };
const kinds: KindCfg[] = [
  { kind: 'نمونه‌کار', label: 'نمونه‌کار', sub: 'category', fields: [
    { key: 'link', label: 'لینک سایت', type: 'url', full: true, hint: 'فقط لینک را بدهید؛ عنوان، توضیح و تصویر کاور به‌طور خودکار از خود سایت خوانده می‌شود (هر فیلد را پر کنید، همان استفاده می‌شود)' },
    { key: 'title', label: 'عنوان پروژه', full: true }, { key: 'subtitle', label: 'کارفرما' },
    { key: 'category', label: 'دسته‌بندی', type: 'select', options: ['سامانه سازمانی و دانشگاهی', 'فروشگاه اینترنتی', 'رزرو و خدمات آنلاین', 'وب‌سایت شرکتی', 'اپلیکیشن موبایل', 'سایر'] },
    { key: 'projectStatus', label: 'وضعیت', type: 'select', options: ['منتشرشده', 'در حال طراحی'] },
    { key: 'featured', label: 'نمایش ویژه (کارت بزرگ)', type: 'checkbox' },
    { key: 'tags', label: 'ویژگی‌ها', hint: 'با ویرگول جدا کنید', full: true }, { key: 'image', label: 'تصویر کاور (اختیاری)', type: 'image' }, { key: 'body', label: 'توضیحات', type: 'textarea' } ] },
  { kind: 'خدمت', label: 'خدمت', sub: 'category', fields: [{ key: 'title', label: 'عنوان خدمت', required: true }, { key: 'category', label: 'دسته‌بندی', type: 'select', options: ['طراحی و توسعه', 'زیرساخت و هوش مصنوعی'] }, { key: 'tags', label: 'برچسب‌ها', hint: 'با ویرگول جدا کنید' }, { key: 'body', label: 'توضیحات', type: 'textarea' }] },
  { kind: 'نظر مشتری', label: 'نظر', sub: 'subtitle', fields: [{ key: 'title', label: 'نام', required: true }, { key: 'subtitle', label: 'سمت / شرکت' }, { key: 'body', label: 'متن نظر', type: 'textarea', required: true }] },
  { kind: 'سوال متداول', label: 'سوال', fields: [{ key: 'title', label: 'سوال', required: true, full: true }, { key: 'body', label: 'پاسخ', type: 'textarea', required: true }] },
  { kind: 'آمار', label: 'آمار', sub: 'subtitle', fields: [{ key: 'title', label: 'عنوان', required: true }, { key: 'subtitle', label: 'عدد', ltr: true, required: true }, { key: 'tags', label: 'پسوند', hint: 'مثلاً + یا ٪' }] },
];

function VisibleToggle({ r }: { r: any }) {
  const api = useApi();
  const [on, setOn] = useState(!!r.visible);
  return <button onClick={async (e) => { e.stopPropagation(); const n = !on; setOn(n); try { await api.save('contentItems', { visible: n }, r.id); toast.success(n ? 'در سایت نمایش داده می‌شود' : 'از سایت پنهان شد'); } catch (er) { setOn(!n); toast.error(errMsg(er)); } }} className="rounded-lg p-1.5 hover:bg-muted">{on ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</button>;
}

export function Content() {
  const [k, setK] = useState(kinds[0]);
  return (
    <>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-soft [scrollbar-width:none]">
        {kinds.map((x) => <button key={x.kind} onClick={() => setK(x)} className={cn('shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors', k.kind === x.kind ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>{x.kind === 'خدمت' ? 'خدمات' : x.kind === 'نمونه‌کار' ? 'نمونه‌کارها' : x.kind === 'نظر مشتری' ? 'نظرات مشتریان' : x.kind === 'سوال متداول' ? 'سوالات متداول' : 'آمار'}</button>)}
      </div>
      <CrudPage key={k.kind} table="contentItems" filters={{ kind: k.kind }} title={`مدیریت محتوا — ${k.kind}`} desc="تغییرات بلافاصله روی سایت اعمال می‌شود · ترتیب نمایش با عدد «ترتیب»" label={k.label}
        defaults={{ kind: k.kind, visible: true, sortOrder: 0, ...(k.kind === 'نمونه‌کار' ? { category: 'وب‌سایت شرکتی', projectStatus: 'منتشرشده' } : k.kind === 'خدمت' ? { category: 'طراحی و توسعه' } : {}) }} searchKeys={['title', 'subtitle', 'body', 'tags']}
        cols={[
          { key: 'sortOrder', label: 'ترتیب', className: 'w-16', render: (r) => <span className="text-muted-foreground">{num(r.sortOrder)}</span> },
          ...(k.kind === 'نمونه‌کار' ? [{ key: 'image', label: '', className: 'w-20', render: (r: any) => (r.image ? <img src={r.image} alt="" className="h-10 w-14 rounded-lg object-cover" /> : null) }] : []),
          { key: 'title', label: 'عنوان', render: (r) => <div className="max-w-md"><p className="font-bold">{r.title}</p>{k.sub && <p className="truncate text-xs text-muted-foreground">{r[k.sub]}{r.projectStatus ? ` · ${r.projectStatus}` : ''}{r.featured ? ' · ویژه' : ''}</p>}</div> },
          { key: 'visible', label: 'نمایش', render: (r) => <VisibleToggle r={r} /> },
        ]}
        fields={[...k.fields, { key: 'sortOrder', label: 'ترتیب نمایش', type: 'number' }, { key: 'visible', label: 'نمایش در سایت', type: 'checkbox' }]} />
    </>
  );
}

/* ---------------- key/value settings ---------------- */
function SettingsForm({ title, desc, fields }: { title: string; desc: string; fields: Field[] }) {
  const api = useApi();
  const { rows, reload } = useList('siteSettings');
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (rows) setV(Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))); }, [rows]);
  const save = async () => {
    setBusy(true);
    try {
      for (const f of fields) {
        const ex = rows?.find((r) => r.key === f.key);
        if ((ex?.value ?? '') !== (v[f.key] ?? '')) await api.save('siteSettings', { key: f.key, value: v[f.key] ?? '' }, ex?.id);
      }
      toast.success('ذخیره شد'); reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead title={title} desc={desc} actions={<Button onClick={save} disabled={busy || !rows} className="h-10 rounded-xl font-bold">{busy ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}ذخیره تغییرات</Button>} />
      <Panel className="grid gap-5 p-5 sm:grid-cols-2 md:p-7">
        {fields.map((f) => (
          <div key={f.key} className={cn((f.full || f.type === 'textarea') && 'sm:col-span-2')}>
            <Label className="text-xs font-bold">{f.label}</Label>
            <FieldInput f={f} value={v[f.key]} onChange={(x) => setV((s) => ({ ...s, [f.key]: x }))} />
            {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
      </Panel>
    </>
  );
}

export const SiteSettings = () => (
  <SettingsForm title="تنظیمات سایت" desc="متن‌ها، اطلاعات تماس و شبکه‌های اجتماعی سایت" fields={[
    { key: 'hero.lead', label: 'متن معرفی زیر تیتر اصلی', type: 'textarea' },
    { key: 'contact.email', label: 'ایمیل تماس', type: 'email' }, { key: 'contact.phone', label: 'تلفن تماس', ltr: true },
    { key: 'contact.note', label: 'توضیح همکاری', full: true },
    { key: 'social.instagram', label: 'اینستاگرام (لینک کامل)', type: 'url' }, { key: 'social.linkedin', label: 'لینکدین (لینک کامل)', type: 'url' },
    { key: 'social.telegram', label: 'تلگرام (لینک کامل)', type: 'url', hint: 'شبکه‌های خالی در سایت نمایش داده نمی‌شوند' },
  ]} />
);

export const Company = () => (
  <SettingsForm title="اطلاعات صورتحساب" desc="این اطلاعات در بخش «صادرکننده» روی همه فاکتورها چاپ می‌شود" fields={[
    { key: 'company.name', label: 'نام صادرکننده' }, { key: 'company.nationalId', label: 'شناسه ملی / کد اقتصادی', ltr: true },
    { key: 'company.phone', label: 'تلفن', ltr: true }, { key: 'company.email', label: 'ایمیل', type: 'email' },
    { key: 'company.address', label: 'آدرس', type: 'textarea' },
    { key: 'company.invoiceNote', label: 'یادداشت پیش‌فرض پایین فاکتور', type: 'textarea' },
  ]} />
);
