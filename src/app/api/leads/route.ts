import { NextRequest, NextResponse, after } from 'next/server';
import { and, count, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { leadAttempts, leads } from '@/db/schema';
import { cleanupOldAttempts } from '@/lib/attempt-cleanup';
import { leadSchema } from '@/lib/lead-validation';
import { sendLeadNotifications } from '@/lib/notify';
import { hashClientIp, resolveClientIp } from '@/lib/request-security';

export async function POST(request: NextRequest) {
  try {
    const parsed = leadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'invalid', error: 'اطلاعات واردشده معتبر نیست.', fields: z.flattenError(parsed.error).fieldErrors },
        { status: 400 },
      );
    }
    if (parsed.data.website) {
      return NextResponse.json({ code: 'invalid', error: 'درخواست قابل پردازش نیست.' }, { status: 400 });
    }

    await cleanupOldAttempts().catch((error) => console.error('Attempt cleanup failed', error));
    const ipHash = hashClientIp(resolveClientIp(request.headers));
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [result] = await db
      .select({ total: count() })
      .from(leadAttempts)
      .where(and(eq(leadAttempts.ipHash, ipHash), gte(leadAttempts.createdAt, since)));
    if (result.total >= 5) {
      return NextResponse.json(
        { code: 'rate_limited', error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید.' },
        { status: 429 },
      );
    }

    await db.insert(leadAttempts).values({ ipHash });
    const { website: _website, locale: submittedLocale, ...valid } = parsed.data;
    const locale = submittedLocale ?? 'fa';
    // Success is reported only if this insert succeeds; consent time is stored with the lead.
    const [lead] = await db
      .insert(leads)
      .values({ ...valid, locale, consentAt: new Date() })
      .returning({ id: leads.id });

    // Notifications run after the response, are logged on failure and can never undo the insert.
    after(() =>
      sendLeadNotifications({
        id: lead.id,
        locale,
        name: valid.name,
        projectType: valid.projectType,
        budget: valid.budget,
        timeline: valid.timeline,
      }),
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Lead submission failed', error);
    return NextResponse.json({ code: 'server', error: 'ثبت درخواست انجام نشد. لطفاً دوباره تلاش کنید.' }, { status: 500 });
  }
}
