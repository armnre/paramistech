// Create an admin or reset an admin's password:
//   npm run admin -- <username> <password> ["مدیر کل"|"مالی"|"محتوا"] [display name]
import './env';
import { pool, zite } from 'zitejs/db';
import { hashPassword } from '../../../apps/paramistech/src/server/lib';

const [username, password, role = 'مدیر کل', ...rest] = process.argv.slice(2);
if (!username || !password || password.length < 8 || username.length < 3) {
  console.error('Usage: npm run admin -- <username(min 3)> <password(min 8)> [مدیر کل|مالی|محتوا] [display name]');
  process.exit(1);
}
const u = username.trim().toLowerCase();
const passwordHash = await hashPassword(password);
const found = await zite.admins.findOne({ filters: { username: u } });
if (found) {
  await zite.admins.update({ id: found.id, record: { passwordHash, active: true, role } });
  console.log(`✔ رمز مدیر «${u}» به‌روزرسانی و حساب فعال شد (نقش: ${role}).`);
} else {
  await zite.admins.create({ record: { username: u, displayName: rest.join(' ') || 'مدیر سامانه', passwordHash, role, active: true } });
  console.log(`✔ مدیر «${u}» ساخته شد (نقش: ${role}).`);
}
await pool.end();
