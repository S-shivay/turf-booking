import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Unit tests only — pure functions, no database, no network.
 *
 * The single job of this file is to teach vitest the `@/` alias the app uses
 * everywhere, so a test can import a module that imports another module
 * without every file in the chain having to switch to relative paths.
 */
export default defineConfig({
  resolve: {
    alias: { '@': resolve(import.meta.dirname, '.') },
  },
  test: {
    include: ['lib/**/*.test.ts'],
  },
});
