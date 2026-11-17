import { Pool } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// With DATABASE_URL set (Vercel, CI) this talks to Postgres on Neon. Without it, local development
// uses PGlite: real Postgres running in-process and stored in .data/, so nothing needs installing.
// Kept on globalThis so hot reloads in `next dev` reuse one connection instead of opening more.
const globalForDb = globalThis as unknown as { havenDb?: Db };

function create(): Db {
  const url = process.env.DATABASE_URL;
  if (url) return drizzleNeon(new Pool({ connectionString: url }), { schema }) as unknown as Db;
  if (process.env.VERCEL) throw new Error('DATABASE_URL is not set');
  // Loaded lazily so the PGlite build never ships to production
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PGlite } = require('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require('drizzle-orm/pglite') as typeof import('drizzle-orm/pglite');
  return drizzle(new PGlite(process.env.PGLITE_DIR || '.data/pglite'), { schema }) as unknown as Db;
}

// Opened on first use, not on import: the production build imports this file from several
// worker processes at once, and none of them should touch the database.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = (globalForDb.havenDb ??= create());
    const value = Reflect.get(real, prop);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
export { schema };
