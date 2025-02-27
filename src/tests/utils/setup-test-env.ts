import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Mock window.location
const mockLocation = {
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  href: 'http://localhost:5173',
  origin: 'http://localhost:5173',
  protocol: 'http:',
  host: 'localhost:5173',
  hostname: 'localhost',
  port: '5173',
  pathname: '/',
  search: '',
  hash: '',
};

// Mock window.navigator
const mockNavigator = {
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
  userAgent: 'Mozilla/5.0 (Test)',
};

// Mock window.confirm
const mockConfirm = vi.fn(() => true);

// Set up global mocks
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
});

Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Export mocks for use in tests
export { mockLocation, mockNavigator, mockConfirm }; 