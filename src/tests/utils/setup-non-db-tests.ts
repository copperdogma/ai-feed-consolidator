import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Set test timeout
beforeAll(() => {
  vi.setConfig({ testTimeout: 60000 });
});

// Clean up after all tests
afterAll(() => {
  vi.clearAllMocks();
  vi.resetModules();
}); 