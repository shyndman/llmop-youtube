import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    includeSource: ['src/**/*.{js,ts}'],
    globals: true,
  },
});
