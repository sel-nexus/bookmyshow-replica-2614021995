import { defineConfig } from 'vitest/config';

/** Configure browser-like component and route-handler testing for the Next.js frontend. */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
  },
});
