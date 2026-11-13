// Import deploy/seed/data.json (exported from the original site). Keeps ids so links stay intact.
// Safe to re-run: existing rows (same id) are left untouched.
//   npm run seed                         public content (deploy/seed/data.json)
//   npm run seed -- --file /path/private-data.json   business data (customers, invoices, …)
//   add --overwrite to replace existing rows with the file's values
import './env';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from 'zitejs/db';

const here = path.dirname(fileURLToPath(import.meta.url));
const fi = process.argv.indexOf('--file');
const file = fi > 0 ? path.resolve(process.argv[fi + 1]) : path.resolve(here, '../../seed/data.json');
console.log('seed file:', file);
const overwrite = process.argv.includes('--overwrite');
const data: Record<string, Record<string, unknown>[]> = JSON.parse(fs.readFileSync(file, 'utf8'));
const ORDER = ['Admins', 'Customers', 'Services', 'Invoices', 'Payments', 'BankAccounts', 'Notifications', 'SiteSettings', 'ActivityLog', 'ContentItems', 'ProjectRequests'];

for (const table of ORDER) {
  const rows = data[table] ?? [];
  const meta = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1', [table]);
  const types = new Map(meta.rows.map((r) => [r.column_name, r.data_type]));
  let n = 0;
  for (const row of rows) {
    const rec: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!types.has(k) || v === undefined) continue;
      const t = types.get(k);
      if (t === 'ARRAY') rec[k] = (Array.isArray(v) ? v : v ? [v] : []).map((x: any) => (typeof x === 'object' ? x.id : String(x))); // eslint-disable-line @typescript-eslint/no-explicit-any
      else if (t === 'jsonb') rec[k] = JSON.stringify(Array.isArray(v) ? v.map((a: any) => ({ url: a.url, filename: a.filename })) : []); // eslint-disable-line @typescript-eslint/no-explicit-any
      else rec[k] = v === '' && t !== 'text' ? null : v;
    }
    const keys = Object.keys(rec);
    const conflict = overwrite ? `DO UPDATE SET ${keys.filter((k) => k !== 'id').map((k) => `"${k}" = EXCLUDED."${k}"`).join(', ')}` : 'DO NOTHING';
    const r = await pool.query(`INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT ("id") ${conflict}`, keys.map((k) => rec[k]));
    n += r.rowCount ?? 0;
  }
  console.log(`${table}: ${n}/${rows.length}`);
}
await pool.end();
console.log('✔ seed done');
