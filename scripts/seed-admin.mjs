// Creates or updates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD.
// Re-running resets that admin's password, re-activates the account and signs it out everywhere.
// Local:      node scripts/seed-admin.mjs
// Container:  docker compose exec app node scripts/seed-admin.mjs
import bcrypt from 'bcryptjs';
import pg from 'pg';

try {
  await import('dotenv/config');
} catch {
  // Containers receive their environment directly.
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 14) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (14+ characters) in the environment.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role, is_active)
     VALUES ($1, $2, 'admin', true)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, role = 'admin', is_active = true
     RETURNING id`,
    [email, passwordHash],
  );
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id]);
  console.log('Admin account is ready.');
} finally {
  await pool.end();
}
