import { defineConfig } from 'vitest/config';

// Integration tests talk to the local Supabase database (pnpm db:start). Run with: pnpm test:integration
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.int-spec.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
