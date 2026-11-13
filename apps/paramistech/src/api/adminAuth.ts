import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { hashPassword, log, requireAdmin, signToken, verifyPassword } from '../server/lib';

export default createEndpoint({
  description: 'Admin panel sign-in, first-admin setup and session check',
  inputSchema: z.object({
    action: z.enum(['status', 'login', 'setup', 'me', 'changePassword']),
    username: z.string().optional(),
    password: z.string().optional(),
    displayName: z.string().optional(),
    newPassword: z.string().optional(),
    token: z.string().optional(),
  }),
  outputSchema: z.object({
    hasAdmins: z.boolean().optional(),
    token: z.string().optional(),
    admin: z.object({ id: z.string(), username: z.string(), name: z.string(), role: z.string() }).optional(),
  }),
  execute: async ({ input }) => {
    const { records: any } = await zite.admins.findAll({ limit: 1, fields: ['id'] });
    const hasAdmins = any.length > 0;
    if (input.action === 'status') return { hasAdmins };

    if (input.action === 'setup') {
      if (hasAdmins) throw new ZiteError({ code: 'FORBIDDEN', message: 'Setup closed', userFacingMessage: 'مدیر اصلی قبلاً تعریف شده است.' });
      const u = (input.username ?? '').trim().toLowerCase();
      if (u.length < 3 || (input.password ?? '').length < 8) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Invalid', userFacingMessage: 'نام‌کاربری حداقل ۳ و رمز حداقل ۸ کاراکتر باشد.' });
      const a = await zite.admins.create({ record: { username: u, displayName: input.displayName || u, passwordHash: await hashPassword(input.password!), role: 'مدیر کل', active: true, lastLoginAt: new Date() } });
      await log(u, 'ایجاد مدیر اصلی');
      return { hasAdmins: true, token: await signToken(a.id), admin: { id: a.id, username: u, name: a.displayName ?? u, role: 'مدیر کل' } };
    }

    if (input.action === 'login') {
      const u = (input.username ?? '').trim().toLowerCase();
      const a = await zite.admins.findOne({ filters: { username: u } });
      const ok = a && a.active && a.passwordHash && (await verifyPassword(input.password ?? '', a.passwordHash));
      if (!ok || !a) throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Bad credentials', userFacingMessage: 'نام‌کاربری یا رمز عبور اشتباه است.' });
      await zite.admins.update({ id: a.id, record: { lastLoginAt: new Date() } });
      await log(u, 'ورود به پنل');
      return { hasAdmins, token: await signToken(a.id), admin: { id: a.id, username: u, name: a.displayName || u, role: a.role ?? 'محتوا' } };
    }

    const me = await requireAdmin(input.token);
    if (input.action === 'changePassword') {
      const a = await zite.admins.findOne({ id: me.id });
      if (!a?.passwordHash || !(await verifyPassword(input.password ?? '', a.passwordHash))) throw new ZiteError({ code: 'BAD_REQUEST', message: 'wrong', userFacingMessage: 'رمز فعلی اشتباه است.' });
      if ((input.newPassword ?? '').length < 8) throw new ZiteError({ code: 'BAD_REQUEST', message: 'short', userFacingMessage: 'رمز جدید حداقل ۸ کاراکتر باشد.' });
      await zite.admins.update({ id: me.id, record: { passwordHash: await hashPassword(input.newPassword!) } });
      await log(me.username, 'تغییر رمز عبور');
    }
    return { hasAdmins, admin: me };
  },
});
