import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const types = ['وب‌سایت', 'اپلیکیشن موبایل', 'نرم‌افزار سازمانی', 'هوش مصنوعی و داده', 'زیرساخت ابری', 'سایر'] as const;
const budgets = ['کمتر از ۱۰۰ میلیون', '۱۰۰ تا ۳۰۰ میلیون', '۳۰۰ تا ۸۰۰ میلیون', 'بیش از ۸۰۰ میلیون', 'هنوز مشخص نیست'] as const;
const timelines = ['فوری', '۱ تا ۳ ماه', '۳ تا ۶ ماه', 'انعطاف‌پذیر'] as const;

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional(),
  projectType: z.enum(types),
  budget: z.enum(budgets),
  timeline: z.enum(timelines),
  details: z.string().trim().min(10).max(4000),
  estimatedCost: z.number().min(0).max(1e12).optional(),
  website: z.string().optional(), // honeypot
});

export default createEndpoint({
  description: 'Saves a project request submitted from the website',
  inputSchema: schema,
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input }) => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ZiteError({ code: 'BAD_REQUEST' as never, message: 'invalid input', userFacingMessage: 'اطلاعات فرم معتبر نیست.' });
    const d = parsed.data;
    if (d.website) return { ok: true };
    await zite.projectRequests.create({
      record: {
        fullName: d.fullName,
        phone: d.phone,
        email: d.email || undefined,
        company: d.company || undefined,
        projectType: d.projectType,
        budget: d.budget,
        timeline: d.timeline,
        details: d.details,
        estimatedCost: d.estimatedCost,
        status: 'جدید',
      },
    });
    return { ok: true };
  },
});
