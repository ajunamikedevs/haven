import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` writes SQL migrations from src/db/schema.ts into ./drizzle.
// `npm run db:migrate` applies them: to Neon when DATABASE_URL is set, otherwise to the local PGlite store.
export default defineConfig(
  process.env.DATABASE_URL
    ? { dialect: 'postgresql', schema: './src/db/schema.ts', out: './drizzle', dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL } }
    : { dialect: 'postgresql', driver: 'pglite', schema: './src/db/schema.ts', out: './drizzle', dbCredentials: { url: process.env.PGLITE_DIR || '.data/pglite' } },
);
