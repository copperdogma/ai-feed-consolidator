import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeedDisplay } from '../FeedDisplay';
import { ProcessedFeedItem } from '../../types/feed';
import { useFeedItems } from '../../hooks/useFeed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useFeedItems hook
vi.mock('../../hooks/useFeed', () => ({
  useFeedItems: vi.fn()
}));

// Create a basic test wrapper without any database dependencies
const customRender = (ui: React.ReactElement, queryClient: QueryClient) => {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  });
};

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

describe('FeedDisplay (No DB)', () => {
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

    customRender(<FeedDisplay />, queryClient);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should show error message', () => {
    const error = new Error('Test error');
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
      refetch: vi.fn().mockResolvedValue({ data: [], isError: true, isSuccess: false, error }),
      promise: Promise.reject(error).catch(() => [] as ProcessedFeedItem[])
    });

    customRender(<FeedDisplay />, queryClient);
    
    const errorElements = screen.getAllByText(/test error|failed to load feed items/i);
    expect(errorElements.length).toBeGreaterThan(0);
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

    customRender(<FeedDisplay />, queryClient);
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

    customRender(<FeedDisplay />, queryClient);
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

    customRender(<FeedDisplay />, queryClient);

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

    customRender(<FeedDisplay />, queryClient);

    const refreshButton = screen.getByTestId('feed-refresh-button');
    fireEvent.click(refreshButton);
    expect(refetchMock).toHaveBeenCalled();
  });
}); 