import { defineConfig } from 'vitest/config';

// Unit tests cover the pure logic in src/lib. The Playwright suite in e2e/ runs separately.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
