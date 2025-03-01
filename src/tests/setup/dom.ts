import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock browser APIs
const mockWindow = {
  navigator: {
    clipboard: {
      writeText: vi.fn(),
    },
    share: vi.fn(),
  },
  document: {
    querySelector: vi.fn(),
  },
  location: {
    assign: vi.fn(),
    reload: vi.fn(),
  },
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
};

beforeAll(() => {
  // Setup global mocks
  Object.defineProperty(globalThis, 'window', { value: mockWindow });
  Object.defineProperty(globalThis, 'document', { value: mockWindow.document });
  Object.defineProperty(globalThis, 'navigator', { value: mockWindow.navigator });
  Object.defineProperty(globalThis, 'localStorage', { value: mockWindow.localStorage });
  Object.defineProperty(globalThis, 'sessionStorage', { value: mockWindow.sessionStorage });
});

afterEach(() => {
  cleanup(); // Clean up after each test
  vi.clearAllMocks(); // Reset all mocks
});

afterAll(() => {
  vi.resetAllMocks(); // Reset all mocks after all tests
}); 