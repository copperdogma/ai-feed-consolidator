import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupMockServer, resetMockServer, cleanupMockServer } from './mock-server';
import { JSDOM } from 'jsdom';

declare global {
  interface Window {
    ResizeObserver: typeof ResizeObserver;
    IntersectionObserver: typeof IntersectionObserver;
  }
}

// Create a new JSDOM instance
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

// Set up global DOM environment
global.window = dom.window as unknown as Window & typeof globalThis;
global.document = window.document;
global.navigator = window.navigator;

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

// Setup ResizeObserver mock
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// Setup IntersectionObserver mock
class MockIntersectionObserver {
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
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

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