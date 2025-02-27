import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [
      'dotenv/config',
      './src/tests/utils/setup-react-tests.ts'
    ],
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    maxWorkers: 1,
    minWorkers: 1,
    isolate: false,
    include: [
      'src/server/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/lib/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/utils/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/hooks/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/tests/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    exclude: [
      'src/components/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/pages/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/[.]**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress}.config.*',
      ],
    },
  },
}); 