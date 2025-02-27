import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useFeeds } from '../useFeeds';
import { Feed } from '../../types/feed-management';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

// Mock the api-helpers module
vi.mock('../../utils/api-helpers', () => ({
  fetchFromAPI: vi.fn(),
}));

// Import the mocked module
import { fetchFromAPI } from '../../utils/api-helpers';

// Mock feed data
const mockFeeds: Feed[] = [
  {
    id: 1,
    feedUrl: 'https://example.com/feed.xml',
    title: 'Test Feed 1',
    description: 'A test feed',
    isActive: true,
    errorCount: 0,
    fetchIntervalMinutes: 60,
    updateFrequency: 'hourly',
  },
  {
    id: 2,
    feedUrl: 'https://example.org/rss',
    title: 'Test Feed 2',
    description: 'Another test feed',
    isActive: false,
    errorCount: 2,
    fetchIntervalMinutes: 120,
    updateFrequency: 'daily',
  },
];

// Create a fresh QueryClient for tests
function createTestWrapper() {
  const testClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: testClient }, children)
  );
}

describe('useFeeds', () => {
  let fetchPromiseResolve: (value: Feed[]) => void;
  let fetchPromiseReject: (reason: Error) => void;
  let fetchPromise: Promise<Feed[]>;

  // Set up controlled promise for mocking fetchFromAPI
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Create a new promise that we can resolve/reject manually
    fetchPromise = new Promise((resolve, reject) => {
      fetchPromiseResolve = resolve;
      fetchPromiseReject = reject;
    });
    
    // Mock implementation to return our controlled promise
    (fetchFromAPI as vi.Mock).mockImplementation(() => fetchPromise);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    // Arrange
    const wrapper = createTestWrapper();
    
    // Act
    const { result } = renderHook(() => useFeeds(), { wrapper });
    
    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.feeds).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(fetchFromAPI).toHaveBeenCalledWith('/api/feeds');
  });

  it('should return feeds when query succeeds', async () => {
    // Arrange
    const wrapper = createTestWrapper();
    
    // Act
    const { result } = renderHook(() => useFeeds(), { wrapper });
    
    // Verify initial state
    expect(result.current.isLoading).toBe(true);
    
    // Resolve the fetch promise
    fetchPromiseResolve(mockFeeds);
    
    // Wait for a UI update cycle
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Assert
    expect(result.current.feeds).toEqual(mockFeeds);
    expect(result.current.error).toBeNull();
    expect(fetchFromAPI).toHaveBeenCalledWith('/api/feeds');
  });

  it('should return error when query fails', async () => {
    // Arrange
    const wrapper = createTestWrapper();
    const testError = new Error('Failed to fetch feeds');
    
    // Act
    const { result } = renderHook(() => useFeeds(), { wrapper });
    
    // Verify initial state
    expect(result.current.isLoading).toBe(true);
    
    // Reject the fetch promise
    fetchPromiseReject(testError);
    
    // Wait for a UI update cycle
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Assert
    expect(result.current.feeds).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(fetchFromAPI).toHaveBeenCalledWith('/api/feeds');
  });
}); 