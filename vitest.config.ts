import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://127.0.0.1:4173/fixture.html' } },
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.mjs'],
    clearMocks: true,
  },
});
