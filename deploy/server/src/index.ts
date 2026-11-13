// ParamisTech standalone API: serves the app's own endpoint files (apps/paramistech/src/api/*.ts)
// at POST /api/<name>, plus file uploads, health check and a background billing timer.
import './env';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool } from 'zitejs/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const API_DIR = path.join(ROOT, 'apps/paramistech/src/api');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// --- per-IP rate limiter ---
const hits = new Map<string, { n: number; t: number }>();
const limit = (max: number) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const k = `${req.ip}:${req.path}`; const now = Date.now(); const h = hits.get(k);
  if (!h || now - h.t > 60_000) hits.set(k, { n: 1, t: now });
  else if (++h.n > max) return res.status(429).json({ error: { message: 'درخواست‌ها زیاد است؛ یک دقیقه دیگر تلاش کنید.', code: 'TOO_MANY_REQUESTS' } });
  next();
};
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now - v.t > 120_000) hits.delete(k); }, 60_000).unref();

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); }
});

// --- uploads (admin images, payment receipts) ---
const EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'svg'];
app.post('/api/upload', limit(30), express.raw({ type: '*/*', limit: process.env.UPLOAD_MAX || '10mb' }), (req, res) => {
  const name = decodeURIComponent(String(req.header('x-filename') || 'file'));
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!EXT.includes(ext)) return res.status(400).json({ error: { message: 'فقط تصویر یا PDF مجاز است.' } });
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: { message: 'فایل خالی است.' } });
  const file = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), req.body);
  res.json({ url: `/uploads/${file}` });
});
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '30d', index: false,
  setHeaders: (r, p) => { r.setHeader('X-Content-Type-Options', 'nosniff'); if (p.endsWith('.svg')) r.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'"); },
}));

// --- endpoints ---
const cache = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
async function load(name: string) {
  if (!/^[a-zA-Z0-9]+$/.test(name)) return null;
  if (cache.has(name)) return cache.get(name);
  const file = path.join(API_DIR, `${name}.ts`);
  if (!fs.existsSync(file)) return null;
  const mod = (await import(pathToFileURL(file).href)).default;
  cache.set(name, mod);
  return mod;
}
const STATUS: Record<string, number> = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, TOO_MANY_REQUESTS: 429 };
app.post('/api/:name', limit(240), express.json({ limit: '2mb' }), async (req, res) => {
  const ep = await load(req.params.name);
  if (!ep) return res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
  try {
    let input = req.body?.input ?? {};
    const parsed = ep.inputSchema?.safeParse?.(input);
    if (parsed?.success) input = parsed.data;
    const data = await ep.execute({ input, context: {} });
    res.json({ data: data ?? null });
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const known = e?.constructor?.name === 'ZiteError';
    if (!e?.userFacingMessage) console.error(`[${req.params.name}]`, e);
    res.status(STATUS[e?.code] ?? (known ? 400 : 500)).json({ error: { message: e?.userFacingMessage || (known ? e.message : 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'), code: e?.code } });
  }
});

// --- billing: issue due invoices / mark overdue every hour (lib throttles to 6h) ---
async function billing() {
  try { const lib = await import(pathToFileURL(path.join(ROOT, 'apps/paramistech/src/server/lib.ts')).href); await lib.maybeRunBilling(); }
  catch (e) { console.error('[billing]', e); }
}
setTimeout(billing, 15_000).unref();
setInterval(billing, 60 * 60_000).unref();

const port = Number(process.env.PORT || 3000);
app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`ParamisTech API listening on ${port}`));
