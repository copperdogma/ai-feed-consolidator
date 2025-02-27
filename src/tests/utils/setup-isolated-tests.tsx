/**
 * DB-free test setup for client-side tests
 * 
 * This utility provides common setup, mocks, and utilities for testing React components
 * without any database dependencies. Use this instead of setup-component-tests.ts
 * to avoid database connection issues during component testing.
 */

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, RequestHandler } from 'msw';
import { setupServer } from 'msw/node';
import { afterEach, beforeAll, vi, afterAll } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { type ReactElement, type ReactNode } from 'react';
import { setupServer as setupServerNode } from 'msw/node';

/**
 * This utility helps set up a DB-free test environment for client-side tests.
 * It provides:
 * 1. A configured React Query provider
 * 2. MSW setup for API mocking
 * 3. Common browser API mocks (ResizeObserver, etc.)
 * 
 * This allows tests to run without a database connection.
 */

// Mock fetch globally
const mockFetch = vi.fn();

// Create a test query client with default options
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
  },
});

// Set up default MSW handlers for common API endpoints
const defaultHandlers: RequestHandler[] = [
  // Auth verification - always return authenticated
  http.get('/api/auth/verify', () => {
    return new Response(
      JSON.stringify({ isAuthenticated: true, user: { id: 1, email: 'test@example.com' } }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // GET /api/feeds - return empty array by default
  http.get('/api/feeds', () => {
    return new Response(
      JSON.stringify([]),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // POST /api/feeds - add new feed
  http.post('/api/feeds', async ({ request }) => {
    const data = await request.json() as { feedUrl?: string };
    const feedUrl = data?.feedUrl || 'https://example.com/default.xml';
    
    return new Response(
      JSON.stringify({
        id: 999,
        feedUrl,
        title: 'Mocked Feed',
        description: 'A mocked feed',
        isActive: true,
        errorCount: 0,
        fetchIntervalMinutes: 60,
        updateFrequency: 'hourly',
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // PATCH /api/feeds/:id - update feed
  http.patch('/api/feeds/:id', async ({ request, params }) => {
    const id = Number(params.id);
    const updates = await request.json() as Record<string, unknown>;
    
    return new Response(
      JSON.stringify({
        id,
        feedUrl: 'https://example.com/feed.xml',
        title: updates.title || 'Updated Feed',
        description: 'An updated feed',
        isActive: updates.isActive !== undefined ? updates.isActive : true,
        errorCount: 0,
        fetchIntervalMinutes: updates.fetchIntervalMinutes || 60,
        updateFrequency: updates.updateFrequency || 'hourly',
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // DELETE /api/feeds/:id - delete feed
  http.delete('/api/feeds/:id', () => {
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // POST /api/feeds/:id/toggle - toggle feed active state
  http.post('/api/feeds/:id/toggle', async ({ request }) => {
    const body = await request.json() as { isActive?: boolean };
    
    return new Response(
      JSON.stringify({ 
        success: true,
        isActive: body.isActive !== undefined ? body.isActive : false 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // POST /api/feeds/:id/refresh - refresh feed
  http.post('/api/feeds/:id/refresh', () => {
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // POST /api/feeds/import - import OPML
  http.post('/api/feeds/import', () => {
    return new Response(
      JSON.stringify({ added: 2, skipped: 1, errors: [] }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),
];

// Create the MSW server
const server = setupServer(...defaultHandlers);

// Custom handlers for individual tests
let dynamicHandlers: RequestHandler[] = [];

// Add custom handlers for a specific test
export function addTestHandlers(...handlers: RequestHandler[]) {
  dynamicHandlers = handlers;
  server.use(...handlers);
}

// Reset custom handlers
export function resetHandlers() {
  dynamicHandlers = [];
  server.resetHandlers();
}

// Start the server before all tests
beforeAll(() => {
  console.log('MSW Server started for isolated tests');
  server.listen({ onUnhandledRequest: 'bypass' });
  
  // Mock global browser APIs
  // ResizeObserver mock
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  
  // IntersectionObserver mock
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    callback: IntersectionObserverCallback;
    observe() {}
    unobserve() {}
    disconnect() {}
    root = null;
    rootMargin = '';
    thresholds = [0];
    takeRecords = () => [];
  };
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
  console.log('MSW Server stopped for isolated tests');
});

// Test wrapper component for React Query
interface TestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function TestWrapper({ children, queryClient = createTestQueryClient() }: TestWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Custom render function that includes common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  queryClient = createTestQueryClient(),
) {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    ),
  });
}

/**
 * Re-export everything from @testing-library/react for convenience
 */
export * from '@testing-library/react'; 