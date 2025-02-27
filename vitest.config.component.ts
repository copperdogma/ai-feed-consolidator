import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      'dotenv/config',
      './src/tests/utils/setup-jsdom-tests.ts'
    ],
    include: [
      'src/components/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/pages/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/hooks/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/**/*.{js,jsx,ts,tsx}',
        'src/pages/**/*.{js,jsx,ts,tsx}',
        'src/hooks/**/*.{js,jsx,ts,tsx}'
      ],
      exclude: [
        'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        'src/tests/**/*',
        'src/types/**/*',
      ],
    },
  },
}); 