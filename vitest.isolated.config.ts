import { defineConfig } from 'vitest/config';

const TEST_TIMEOUTS = {
  NORMAL: 60000,    // 60s for normal tests
  LONG: 120000,     // 120s for long-running tests
  HOOK: 60000,      // 60s for hooks
  TEARDOWN: 60000,  // 60s for teardown
  CLEANUP: 30000,   // 30s for cleanup operations
};

export default defineConfig({
  test: {
    include: ['src/**/*.isolated.test.{ts,tsx}'],
    exclude: [
      'src/components/**/*.test.{ts,tsx}',
      'src/server/services/feed-handlers/**/*.test.{ts,tsx}'
    ],
    globals: true,
    environment: 'node',
    testTimeout: TEST_TIMEOUTS.NORMAL,
    hookTimeout: TEST_TIMEOUTS.HOOK,
    teardownTimeout: TEST_TIMEOUTS.TEARDOWN,
    sequence: {
      hooks: 'parallel'
    },
    maxConcurrency: 1,
    maxWorkers: 1,
    minWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/*.d.ts',
        'test{,s}/**',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
        '**/*.config.{js,ts}',
      ],
    },
    reporters: ['verbose'],
    logHeapUsage: true,
    silent: false,
    watch: false,
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    retry: 2,
    isolate: true
  }
}); 