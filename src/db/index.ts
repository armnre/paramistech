import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const globalForDb = globalThis as typeof globalThis & {
  __paramisPool?: Pool;
};

function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const pool = globalForDb.__paramisPool ?? new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== 'production') globalForDb.__paramisPool = pool;
  return drizzle(pool);
}

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export function getDb() {
  database ??= createDatabase();
  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const value = Reflect.get(getDb() as object, property, receiver) as unknown;
    return typeof value === 'function' ? value.bind(getDb()) : value;
  },
});
