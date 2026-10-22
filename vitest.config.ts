import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@/src/generated/prisma': path.resolve(import.meta.dirname, './src/generated/prisma/client.ts'),
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
