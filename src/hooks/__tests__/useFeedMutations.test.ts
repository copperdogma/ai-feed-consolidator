import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useFeedMutations } from '../useFeedMutations';
import { Feed, ImportResult } from '../../types/feed-management';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

// Mock the fetch API directly
vi.mock('node:fetch', () => vi.fn());

// Mock feed data
const mockFeed: Feed = {
  id: 1,
  feedUrl: 'https://example.com/feed.xml',
  title: 'Test Feed',
  description: 'A test feed',
  isActive: true,
  errorCount: 0,
  fetchIntervalMinutes: 60,
  updateFrequency: 'hourly',
};

// Create a fresh QueryClient for tests
function createTestWrapper() {
  const testClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: testClient }, children)
  );
}

describe('useFeedMutations', () => {
  // Variables for our controlled promises
  let mockResolve: (value: any) => void;
  let mockReject: (reason: Error) => void;
  let fetchPromise: Promise<any>;
  let globalFetch: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Store the original fetch function
    globalFetch = global.fetch;
    
    // Create a fresh controlled promise for each test
    fetchPromise = new Promise((resolve, reject) => {
      mockResolve = resolve;
      mockReject = reject;
    });
    
    // Mock implementation of fetch to return our controlled promise
    global.fetch = vi.fn().mockImplementation(() => {
      return fetchPromise.then(value => {
        // Return a Response from the resolved value
        return new Response(JSON.stringify(value), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    });
  });

  afterEach(() => {
    // Restore the original fetch
    global.fetch = globalFetch;
    vi.clearAllMocks();
  });

  describe('addFeed', () => {
    it('should add a new feed successfully', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useFeedMutations(), { wrapper });
      
      // Start the mutation
      const addPromise = result.current.addFeed('https://example.com/feed.xml');
      
      // Resolve the controlled promise with mock data
      mockResolve(mockFeed);
      
      // Wait for the mutation to complete
      const newFeed = await addPromise;
      
      // Assert the result
      expect(newFeed).toEqual(mockFeed);
      expect(global.fetch).toHaveBeenCalledWith('/api/feeds', expect.any(Object));
    });

    it('should handle add feed error', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useFeedMutations(), { wrapper });
      
      // Start the mutation
      const errorPromise = result.current.addFeed('invalid-url');
      
      // Simulate an error response
      mockReject(new Error('Failed to add feed'));
      
      // Wait for the mutation to reject
      await expect(errorPromise).rejects.toThrow('Failed to add feed');
    });
  });

  describe('updateFeed', () => {
    it('should update a feed successfully', async () => {
      const updates = { title: 'Updated Title' };
      const updatedFeed = { ...mockFeed, ...updates };
      
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useFeedMutations(), { wrapper });
      
      // Start the mutation
      const updatePromise = result.current.updateFeed({ id: 1, updates });
      
      // Resolve the controlled promise with mock data
      mockResolve(updatedFeed);
      
      // Wait for the mutation to complete
      const feed = await updatePromise;
      
      // Assert the result
      expect(feed).toEqual(updatedFeed);
      expect(global.fetch).toHaveBeenCalledWith('/api/feeds/1', expect.any(Object));
    });
  });

  describe('deleteFeed', () => {
    it('should delete a feed successfully', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useFeedMutations(), { wrapper });
      
      // Start the mutation
      const deletePromise = result.current.deleteFeed(1);
      
      // Resolve the controlled promise
      mockResolve({ success: true });
      
      // Wait for the mutation to complete
      await deletePromise;
      
      // Assert that fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/feeds/1', expect.any(Object));
    });
  });

  describe('toggleFeed', () => {
    it('should toggle feed active state successfully', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useFeedMutations(), { wrapper });
      
      // Start the mutation
      const togglePromise = result.current.toggleFeed({ id: 1, isActive: false });
      
      // Resolve the controlled promise
      mockResolve({ success: true });
      
      // Wait for the mutation to complete
      await togglePromise;
      
      // Assert that fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/feeds/1/toggle', expect.any(Object));
    });
  });

  describe('refreshFeed', () => {
    it('should refresh a feed successfully', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useFeedMutations(), { wrapper });
      
      // Start the mutation
      const refreshPromise = result.current.refreshFeed(1);
      
      // Resolve the controlled promise
      mockResolve({ success: true });
      
      // Wait for the mutation to complete
      await refreshPromise;
      
      // Assert that fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/feeds/1/refresh', expect.any(Object));
    });
  });

  describe('importOPML', () => {
    it('should import OPML file successfully', async () => {
      const importResult: ImportResult = { added: 2, skipped: 1, errors: [] };
      
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useFeedMutations(), { wrapper });
      
      const file = new File(['test content'], 'feeds.opml', { type: 'text/xml' });
      
      // Start the mutation
      const importPromise = result.current.importOPML(file);
      
      // Resolve the controlled promise
      mockResolve(importResult);
      
      // Wait for the mutation to complete
      const response = await importPromise;
      
      // Assert the result
      expect(response).toEqual(importResult);
      expect(global.fetch).toHaveBeenCalledWith('/api/feeds/import', expect.any(Object));
    });
  });
}); 