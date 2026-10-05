// Runs automatically before `npm start` (npm's prestart lifecycle), which is exactly what Liara runs
// when it boots the app. It applies pending migrations when a database is configured, so a deployment
// never serves new code against an old schema; without DATABASE_URL it is a no-op (local `npm start`).
//
// Migrations are idempotent (scripts/migrate.mjs records applied files in schema_migrations), so
// re-running them on every boot/restart is safe. If they fail, the process exits non-zero and the app
// refuses to start - the previous Liara deployment keeps serving traffic instead of a broken one.
if (process.env.DATABASE_URL) {
  await import('./migrate.mjs');
} else {
  console.log('prestart: DATABASE_URL is not set, skipping migrations.');
}
