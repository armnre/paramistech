import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { saveSettings } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { AdminForm, EnglishSection } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: c.settings, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  if (!can(admin.role, 'settings:write')) redirect('/admin');
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  const query = await searchParams;
  return (
    <>
      <h1>{c.settings}</h1>
      {query.saved && <p className="notice">{c.saved}</p>}
      {query.error && <p className="notice error">{query.error}</p>}
      <AdminForm action={saveSettings}>
        <div className="field"><label htmlFor="contactEmail">ایمیل</label><input id="contactEmail" name="contactEmail" type="email" defaultValue={row?.contactEmail} /></div>
        <div className="field"><label htmlFor="contactPhone">تلفن</label><input id="contactPhone" name="contactPhone" defaultValue={row?.contactPhone} /></div>
        <div className="field"><label htmlFor="contactPhoneHref">تلفن بین‌المللی</label><input id="contactPhoneHref" name="contactPhoneHref" dir="ltr" defaultValue={row?.contactPhoneHref} /></div>
        <div className="field"><label htmlFor="contactAddress">نشانی</label><input id="contactAddress" name="contactAddress" defaultValue={row?.contactAddress} /></div>
        <EnglishSection>
          <div className="field"><label htmlFor="contactAddressEn">Address</label><input id="contactAddressEn" name="contactAddressEn" defaultValue={row?.contactAddressEn ?? ''} /></div>
        </EnglishSection>
        {[0, 1, 2].map((index) => (
          <div className="choice-grid" key={index}>
            <div className="field"><label htmlFor={`socialLabel${index}`}>شبکه {index + 1}</label><input id={`socialLabel${index}`} name={`socialLabel${index}`} defaultValue={row?.socials[index]?.label} /></div>
            <div className="field"><label htmlFor={`socialHref${index}`}>نشانی</label><input id={`socialHref${index}`} name={`socialHref${index}`} dir="ltr" defaultValue={row?.socials[index]?.href} /></div>
          </div>
        ))}
        <button className="btn btn-primary" type="submit">{c.save}</button>
      </AdminForm>
    </>
  );
}
