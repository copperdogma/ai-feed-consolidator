import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

// Set up JSDOM environment
const customGlobal = global as any;
customGlobal.IS_REACT_ACT_ENVIRONMENT = true; 