import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupMockServer, resetMockServer, cleanupMockServer } from './mock-server';
import { DatabaseStateManager } from './setup-test-db';
import { QueryClient } from '@tanstack/react-query';

// Extend Vitest's expect with Testing Library's matchers
expect.extend(matchers);

// Setup fetch mock globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Setup MSW
beforeAll(() => {
  setupMockServer();
});

afterEach(() => {
  cleanup();
  resetMockServer();
  vi.clearAllMocks();
  mockFetch.mockReset();
});

afterAll(() => {
  cleanupMockServer();
  vi.useRealTimers();
  vi.resetModules();
  cleanup();
});

// Setup window mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    userAgent: 'test',
    language: 'en-US',
    languages: ['en-US'],
  },
});

// Setup ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Setup IntersectionObserver mock
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
  }

  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = () => [];
  root = null;
  rootMargin = '';
  thresholds = [];
};

// Set test environment
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  vi.useFakeTimers();
});

// Register cleanup hook
afterAll(() => {
  vi.useRealTimers();
  vi.resetModules();
  cleanup();
  
  // Add cleanup hook to global registry
  if (global.__TEST_CLEANUP_HOOKS__) {
    global.__TEST_CLEANUP_HOOKS__.push(async () => {
      // Clear any pending timers
      vi.clearAllTimers();
      
      // Reset all mocks
      vi.resetAllMocks();
      
      // Clear all test environments
      vi.resetModules();
      
      // Force garbage collection if available
      if (typeof global.gc === 'function') {
        global.gc();
      }
    });
  }
});

// Define a global function to check if DB should be skipped
const shouldSkipDatabase = () => {
  return process.env.SKIP_DB_INITIALIZED === 'true';
};

// Configure imports conditionally
let dbManager;
let DatabaseStateManagerClass;

if (!shouldSkipDatabase()) {
  // Only import if database is needed
  try {
    const { DatabaseStateManager } = require('./setup-test-db');
    DatabaseStateManagerClass = DatabaseStateManager;
  } catch (error) {
    console.error('Failed to import DatabaseStateManager:', error);
  }
}

beforeAll(async () => {
  // Skip database initialization if SKIP_DB_INITIALIZED is set
  if (shouldSkipDatabase()) {
    console.log('Skipping database initialization for component tests');
    return;
  }
  
  // Initialize database
  try {
    dbManager = DatabaseStateManagerClass.getInstance();
    await dbManager.initialize();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Don't throw - allow tests to continue
  }
});

beforeEach(() => {
  // Clear React Query cache before each test
  const queryClient = new QueryClient();
  queryClient.clear();
});

afterEach(async () => {
  // Clean up React Testing Library
  cleanup();
  
  // Clean database state if initialized
  if (dbManager && !shouldSkipDatabase()) {
    try {
      await dbManager.cleanDatabase();
    } catch (error) {
      console.error('Failed to clean database:', error);
    }
  }
});

afterAll(async () => {
  // Close database connections if initialized
  if (dbManager && !shouldSkipDatabase()) {
    try {
      await dbManager.closeConnections();
    } catch (error) {
      console.error('Failed to close database connections:', error);
    }
  }
}); 