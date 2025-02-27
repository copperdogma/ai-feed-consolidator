import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, cleanup } from '../../tests/utils/setup-isolated-tests';
import { FeedDisplay } from '../FeedDisplay';
import { ProcessedFeedItem } from '../../types/feed';
import { useFeedItems } from '../../hooks/useFeed';
import { QueryClient } from '@tanstack/react-query';

// Mock the useFeedItems hook
vi.mock('../../hooks/useFeed', () => ({
  useFeedItems: vi.fn()
}));

const mockFeedItems: ProcessedFeedItem[] = [
  {
    id: '1',
    sourceId: 'src_1',
    externalId: 'ext_1',
    title: 'Test Article',
    content: 'Test content',
    summary: 'Test summary',
    url: 'https://example.com',
    publishedAt: new Date(),
    source: {
      id: 'source_1',
      name: 'Test Source',
      platform: 'rss',
      url: 'https://example.com'
    },
    media: [],
    topics: ['tech', 'news'],
    feedConfigId: 1,
    content_type: 'technical',
    time_sensitive: false,
    requires_background: [],
    consumption_time: {
      minutes: 5,
      type: 'read'
    },
    processedAt: new Date(),
    metadata: {
      tags: []
    }
  }
];

describe('FeedDisplay', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should show loading state', () => {
    vi.mocked(useFeedItems).mockReturnValue({
      data: undefined,
      dataUpdatedAt: 0,
      error: null,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isError: false,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: true,
      isPaused: false,
      isLoading: true,
      isLoadingError: false,
      isPlaceholderData: false,
      isPending: true,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: false,
      isInitialLoading: true,
      status: 'pending',
      fetchStatus: 'fetching',
      refetch: vi.fn(),
      promise: Promise.resolve([])
    });

    renderWithProviders(<FeedDisplay />, queryClient);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should show error message', () => {
    // Create a simplified error state
    const mockedHook = {
      isError: true,
      error: new Error('Failed to load'),
      isLoading: false,
      isPending: false,
      data: undefined,
      refetch: vi.fn(),
    };
    
    // Only mock the properties we actually use in the component
    vi.mocked(useFeedItems).mockReturnValue(mockedHook as any);

    renderWithProviders(<FeedDisplay />, queryClient);
    
    // Check for the error text that's actually shown in the component
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    
    // Check for the error icon and retry button
    expect(screen.getByTestId('ErrorOutlineIcon')).toBeInTheDocument();
    expect(screen.getByTestId('error-retry-button')).toBeInTheDocument();
  });

  it('should show no items message when feed is empty', () => {
    vi.mocked(useFeedItems).mockReturnValue({
      data: [],
      dataUpdatedAt: Date.now(),
      error: null,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isError: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isLoading: false,
      isLoadingError: false,
      isPlaceholderData: false,
      isPending: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: true,
      isInitialLoading: false,
      promise: Promise.resolve([]),
      refetch: vi.fn(),
      status: 'success',
      fetchStatus: 'idle'
    });

    renderWithProviders(<FeedDisplay />, queryClient);
    const noItemsElements = screen.getAllByText('No feed items available');
    expect(noItemsElements.length).toBeGreaterThan(0);
  });

  it('should render feed items', () => {
    vi.mocked(useFeedItems).mockReturnValue({
      data: mockFeedItems,
      dataUpdatedAt: Date.now(),
      error: null,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isError: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isLoading: false,
      isLoadingError: false,
      isPlaceholderData: false,
      isPending: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: true,
      isInitialLoading: false,
      promise: Promise.resolve(mockFeedItems),
      refetch: vi.fn(),
      status: 'success',
      fetchStatus: 'idle'
    });

    renderWithProviders(<FeedDisplay />, queryClient);
    const titleElements = screen.getAllByText('Test Article');
    const sourceElements = screen.getAllByText('Test Source');
    expect(titleElements.length).toBeGreaterThan(0);
    expect(sourceElements.length).toBeGreaterThan(0);
  });

  it('should call refetch when retry button is clicked in error state', () => {
    const error = new Error('Test error');
    const refetchMock = vi.fn().mockResolvedValue({ data: [], isError: false, isSuccess: true });
    vi.mocked(useFeedItems).mockReturnValue({
      data: undefined,
      dataUpdatedAt: 0,
      error,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: error,
      errorUpdateCount: 1,
      isError: true,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isLoading: false,
      isLoadingError: true,
      isPlaceholderData: false,
      isPending: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: false,
      isInitialLoading: false,
      status: 'error',
      fetchStatus: 'idle',
      refetch: refetchMock,
      promise: Promise.reject(error).catch(() => [] as ProcessedFeedItem[])
    });

    renderWithProviders(<FeedDisplay />, queryClient);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    expect(refetchMock).toHaveBeenCalled();
  });

  it('should call refetch when refresh button is clicked', () => {
    const refetchMock = vi.fn().mockResolvedValue({ data: mockFeedItems, isError: false, isSuccess: true });
    vi.mocked(useFeedItems).mockReturnValue({
      data: mockFeedItems,
      dataUpdatedAt: Date.now(),
      error: null,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isError: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isLoading: false,
      isLoadingError: false,
      isPlaceholderData: false,
      isPending: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: true,
      isInitialLoading: false,
      status: 'success',
      fetchStatus: 'idle',
      refetch: refetchMock,
      promise: Promise.resolve(mockFeedItems)
    });

    renderWithProviders(<FeedDisplay />, queryClient);

    const refreshButton = screen.getByTestId('feed-refresh-button');
    fireEvent.click(refreshButton);
    expect(refetchMock).toHaveBeenCalled();
  });
}); 