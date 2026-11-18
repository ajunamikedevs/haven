import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests cover the pure logic in src/lib. The Playwright suite in e2e/ runs separately.
// "server-only" throws outside a React server bundle, so unit tests swap it for an empty module.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
  resolve: { alias: { 'server-only': resolve('src/test/server-only.ts') } },
});
