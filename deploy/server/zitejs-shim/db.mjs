// Standalone replacement for "zitejs/db" on PostgreSQL.
// Tables use the SDK class names ("Invoices", "ContentItems") with camelCase columns, so the
// raw SQL in the endpoints runs unchanged. Linked-record fields are text[] columns of ids;
// the inverse side (e.g. Customers.services) is computed on read.
import pg from 'pg';

pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));            // numeric -> number
pg.types.setTypeParser(1082, (v) => v);                                          // date -> 'YYYY-MM-DD'
pg.types.setTypeParser(1184, (v) => (v === null ? null : new Date(v).toISOString())); // timestamptz -> ISO
pg.types.setTypeParser(1114, (v) => (v === null ? null : new Date(v + 'Z').toISOString()));

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.PG_POOL_MAX || 10) });

const NAMES = {
  projectRequests: 'ProjectRequests', admins: 'Admins', customers: 'Customers', services: 'Services',
  invoices: 'Invoices', payments: 'Payments', bankAccounts: 'BankAccounts', notifications: 'Notifications',
  siteSettings: 'SiteSettings', activityLog: 'ActivityLog', contentItems: 'ContentItems',
};
// inverse links: table -> { field: [otherTable, linkColumn] }
const INVERSE = {
  Customers: { services: ['Services', 'customer'], invoices: ['Invoices', 'customer'], payments: ['Payments', 'customer'], notifications: ['Notifications', 'customer'] },
  Services: { invoices: ['Invoices', 'service'] },
  Invoices: { payments: ['Payments', 'invoice'] },
};
const READONLY = new Set(['id', 'createdAt', 'submittedAt']);

const meta = new Map();
async function columns(table) {
  if (!meta.has(table)) {
    const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1", [table]);
    if (!r.rows.length) throw new Error(`Unknown table ${table}`);
    meta.set(table, new Map(r.rows.map((x) => [x.column_name, x.data_type])));
  }
  return meta.get(table);
}
const q = (c) => `"${String(c).replace(/"/g, '')}"`;

function coerce(type, v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return type === 'ARRAY' ? [] : type === 'jsonb' ? '[]' : type === 'text' ? v : null;
  if (type === 'ARRAY') { const a = Array.isArray(v) ? v : [v]; return a.map((x) => (x && typeof x === 'object' ? x.id : x)).filter(Boolean).map(String); }
  if (type === 'jsonb') {
    const a = (Array.isArray(v) ? v : [v]).map((x) => (typeof x === 'string' ? { url: x, filename: decodeURIComponent(x.split('/').pop() || 'file') } : x)).filter((x) => x && x.url);
    return JSON.stringify(a);
  }
  if (type === 'boolean') return v === true || v === 'true' || v === 1 || v === '1';
  if (type === 'numeric') { if (v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
  if (type === 'date' || type.startsWith('timestamp')) { if (v === '') return null; return v instanceof Date ? v.toISOString() : v; }
  return typeof v === 'object' ? JSON.stringify(v) : v;
}
function clean(cols, rec) {
  const out = {};
  for (const [k, v] of Object.entries(rec || {})) {
    if (!cols.has(k) || READONLY.has(k) || v === undefined) continue;
    out[k] = coerce(cols.get(k), v);
  }
  return out;
}
function where(cols, filters, params) {
  const parts = [];
  for (const [k, v] of Object.entries(filters || {})) {
    if (v === undefined || !cols.has(k)) continue;
    const col = q(k); const isArr = cols.get(k) === 'ARRAY';
    const p = (val) => { params.push(val); return '$' + params.length; };
    if (v === null) { parts.push(isArr ? `COALESCE(cardinality(${col}),0) = 0` : `${col} IS NULL`); continue; }
    if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      for (const [op, val] of Object.entries(v)) {
        if (val === undefined) continue;
        if (op === 'contains') parts.push(`${col}::text ILIKE ${p('%' + val + '%')}`);
        else if (op === 'not') parts.push(val === null ? `${col} IS NOT NULL` : isArr ? `NOT (${p(String(val))} = ANY(COALESCE(${col},'{}')))` : `${col} IS DISTINCT FROM ${p(coerce(cols.get(k), val))}`);
        else if (op === 'in') parts.push(!val.length ? 'FALSE' : isArr ? `${col} && ${p(val.map(String))}::text[]` : `${col} = ANY(${p(val)})`);
        else if (op === 'notIn') { if (val.length) parts.push(isArr ? `NOT (${col} && ${p(val.map(String))}::text[])` : `NOT (${col} = ANY(${p(val)}))`); }
        else if (['lt', 'lte', 'gt', 'gte'].includes(op)) parts.push(`${col} ${{ lt: '<', lte: '<=', gt: '>', gte: '>=' }[op]} ${p(val)}`);
      }
      continue;
    }
    if (isArr) parts.push(Array.isArray(v) ? `${col} @> ${p(v.map(String))}::text[]` : `${p(String(v))} = ANY(${col})`);
    else parts.push(`${col} = ${p(coerce(cols.get(k), v))}`);
  }
  return parts.length ? ' WHERE ' + parts.join(' AND ') : '';
}
function select(name) {
  const inv = INVERSE[name] || {};
  const extra = Object.entries(inv).map(([f, [t, c]]) => `, ARRAY(SELECT x."id" FROM ${q(t)} x WHERE t."id" = ANY(x.${q(c)}) ORDER BY x."createdAt") AS ${q(f)}`).join('');
  return `SELECT t.*${extra} FROM ${q(name)} t`;
}

function table(name) {
  return {
    async findAll({ filters, sort, limit = 500, offset = 0 } = {}) {
      const cols = await columns(name); const params = [];
      const lim = Math.min(Number(limit) || 500, 2000);
      const order = (sort || []).filter((s) => cols.has(s.field)).map((s) => `t.${q(s.field)} ${s.direction === 'desc' ? 'DESC' : 'ASC'} NULLS LAST`);
      const sql = `${select(name)}${where(cols, filters, params)} ORDER BY ${[...order, 't."createdAt" ASC', 't."id" ASC'].join(', ')} LIMIT ${lim + 1} OFFSET ${Math.max(0, Number(offset) || 0)}`;
      const r = await pool.query(sql, params);
      return { records: r.rows.slice(0, lim), hasMore: r.rows.length > lim, total: undefined };
    },
    async findOne({ id, filters } = {}) {
      if (id === undefined && !filters) return undefined;
      const cols = await columns(name); const params = [];
      const w = where(cols, id !== undefined ? { ...(filters || {}), id } : filters, params);
      if (!w) return undefined;
      return (await pool.query(`${select(name)}${w} LIMIT 1`, params)).rows[0];
    },
    async create({ record }) {
      if (!record) throw new Error('Create requires record data');
      const cols = await columns(name); const rec = clean(cols, record); const keys = Object.keys(rec);
      const sql = keys.length
        ? `INSERT INTO ${q(name)} (${keys.map(q).join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING "id"`
        : `INSERT INTO ${q(name)} DEFAULT VALUES RETURNING "id"`;
      const { id } = (await pool.query(sql, keys.map((k) => rec[k]))).rows[0];
      return this.findOne({ id });
    },
    async update({ id, record }) {
      if (!id || !record) throw new Error('Update requires id and record data');
      const cols = await columns(name); const rec = clean(cols, record); const keys = Object.keys(rec);
      if (keys.length) await pool.query(`UPDATE ${q(name)} SET ${keys.map((k, i) => `${q(k)} = $${i + 1}`).join(', ')} WHERE "id" = $${keys.length + 1}`, [...keys.map((k) => rec[k]), id]);
      return this.findOne({ id });
    },
    async delete({ id }) {
      await pool.query(`DELETE FROM ${q(name)} WHERE "id" = $1`, [id]);
      // drop dangling links to the deleted row
      for (const [t, links] of Object.entries(INVERSE)) for (const [, [lt, lc]] of Object.entries(links)) if (t === name) await pool.query(`UPDATE ${q(lt)} SET ${q(lc)} = array_remove(${q(lc)}, $1) WHERE $1 = ANY(${q(lc)})`, [id]);
      return { success: true, id };
    },
    async bulkCreate({ records, matchOn }) {
      if ((records || []).length > 100) throw new Error('bulkCreate accepts up to 100 records');
      const out = [];
      for (const r of records || []) {
        if (matchOn?.length) {
          const found = await this.findOne({ filters: Object.fromEntries(matchOn.map((k) => [k, r[k]])) });
          if (found) { out.push(await this.update({ id: found.id, record: r })); continue; }
        }
        out.push(await this.create({ record: r }));
      }
      return { success: true, records: out };
    },
  };
}

export const zite = Object.fromEntries(Object.entries(NAMES).map(([k, v]) => [k, table(v)]));
zite.sql = async ({ query, params = [] }) => {
  if (!/^\s*(select|with)\b/i.test(query)) throw new Error('sql() is read-only');
  const r = await pool.query(query, params);
  return { rows: r.rows };
};
zite.auth = { findAllUsers: async () => ({ records: [], total: 0, hasMore: false }) };
