import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Unit and component tests. Async Server Components are not supported by Vitest;
// those pages are covered by the manual checklist (docs/testing/manual-checklist.md).
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
});
