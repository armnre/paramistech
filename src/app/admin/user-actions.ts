'use server';

import { compare, hash } from 'bcryptjs';
import { and, count, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { assertMutation } from '@/lib/admin-guard';
import { writeAudit } from '@/lib/audit';
import { COOKIE_NAME, revokeUserSessions } from '@/lib/auth';
import { roles } from '@/lib/permissions';

const passwordSchema = z.string().min(14).max(200);
const passwordError = 'گذرواژه باید دست‌کم ۱۴ نویسه باشد.';

function text(form: FormData, name: string) {
  return String(form.get(name) || '');
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createUser(form: FormData) {
  const actor = await assertMutation('users:manage');
  const parsed = z
    .object({ email: z.email().max(255), role: z.enum(roles), password: passwordSchema })
    .safeParse({ email: text(form, 'email').trim().toLowerCase(), role: text(form, 'role'), password: text(form, 'password') });
  if (!parsed.success) fail('/admin/users', `اطلاعات کاربر معتبر نیست. ${passwordError}`);

  let createdId = 0;
  try {
    const [row] = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        role: parsed.data.role,
        passwordHash: await hash(parsed.data.password, 12),
        isActive: true,
      })
      .returning({ id: users.id });
    createdId = row.id;
  } catch {
    fail('/admin/users', 'این ایمیل قبلاً ثبت شده است.');
  }
  await writeAudit(actor.id, 'user.create', 'user', createdId);
  redirect('/admin/users?saved=1');
}

export async function resetUserPassword(form: FormData) {
  const actor = await assertMutation('users:manage');
  const id = Number(form.get('id'));
  const password = passwordSchema.safeParse(text(form, 'password'));
  if (!password.success) fail('/admin/users', passwordError);

  await db.update(users).set({ passwordHash: await hash(password.data, 12) }).where(eq(users.id, id));
  await revokeUserSessions(id);
  await writeAudit(actor.id, 'user.password_reset', 'user', id);
  redirect('/admin/users?saved=1');
}

export async function setUserActive(form: FormData) {
  const actor = await assertMutation('users:manage');
  const id = Number(form.get('id'));
  const active = form.get('active') === 'true';

  if (!active) {
    if (id === actor.id) fail('/admin/users', 'نمی‌توانید حساب خودتان را غیرفعال کنید.');
    const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
    if (target?.role === 'admin') {
      const [activeAdmins] = await db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.isActive, true)));
      if (activeAdmins.total <= 1) fail('/admin/users', 'دست‌کم یک مدیر فعال باید باقی بماند.');
    }
  }

  await db.update(users).set({ isActive: active }).where(eq(users.id, id));
  if (!active) await revokeUserSessions(id);
  await writeAudit(actor.id, active ? 'user.activate' : 'user.deactivate', 'user', id);
  redirect('/admin/users?saved=1');
}

export async function changeOwnPassword(form: FormData) {
  const actor = await assertMutation('account:manage');
  const next = passwordSchema.safeParse(text(form, 'next'));
  if (!next.success) fail('/admin/account', passwordError);
  if (text(form, 'next') !== text(form, 'confirm')) fail('/admin/account', 'تکرار گذرواژه یکسان نیست.');

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, actor.id)).limit(1);
  if (!row || !(await compare(text(form, 'current'), row.passwordHash))) {
    fail('/admin/account', 'گذرواژه فعلی نادرست است.');
  }

  await db.update(users).set({ passwordHash: await hash(next.data, 12) }).where(eq(users.id, actor.id));
  await revokeUserSessions(actor.id, actor.sessionId);
  await writeAudit(actor.id, 'user.password_change', 'user', actor.id);
  redirect('/admin/account?saved=1');
}

export async function logoutEverywhere() {
  const actor = await assertMutation('account:manage');
  await revokeUserSessions(actor.id);
  await writeAudit(actor.id, 'logout.everywhere', 'session');
  (await cookies()).delete(COOKIE_NAME);
  redirect('/admin');
}
