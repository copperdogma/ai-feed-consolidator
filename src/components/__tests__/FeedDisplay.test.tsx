import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FeedDisplay } from '../FeedDisplay';
import { ProcessedFeedItem } from '../../types/feed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFeedItems } from '../../hooks/useFeed';
import userEvent from '@testing-library/user-event';

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
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

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
      promise: Promise.resolve([]),
      refetch: vi.fn(),
      status: 'pending',
      fetchStatus: 'fetching'
    });

    renderWithClient(<FeedDisplay queryClient={queryClient} />);
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
      promise: Promise.resolve([]),
      refetch: vi.fn(),
      status: 'error',
      fetchStatus: 'idle'
    });

    renderWithClient(<FeedDisplay queryClient={queryClient} />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
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

    renderWithClient(<FeedDisplay queryClient={queryClient} />);
    expect(screen.getByText('No feed items available')).toBeInTheDocument();
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

    renderWithClient(<FeedDisplay queryClient={queryClient} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('Test Source')).toBeInTheDocument();
  });

  it('should call refetch when retry button is clicked in error state', async () => {
    const mockRefetch = vi.fn();
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
      promise: Promise.resolve([]),
      refetch: mockRefetch,
      status: 'error',
      fetchStatus: 'idle'
    });

    renderWithClient(<FeedDisplay queryClient={queryClient} />);
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should call refetch when refresh button is clicked in empty state', async () => {
    const mockRefetch = vi.fn();
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
      refetch: mockRefetch,
      status: 'success',
      fetchStatus: 'idle'
    });

    renderWithClient(<FeedDisplay queryClient={queryClient} />);
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should invalidate queries when feed item bookmark is toggled', async () => {
    const mockInvalidateQueries = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    queryClient.invalidateQueries = mockInvalidateQueries;

    // Mock the fetch response for the toggle mutation
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );

    // Mock the useFeedItems hook to return our test data
    (useFeedItems as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockFeedItems[0]],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isRefetching: false
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FeedDisplay queryClient={queryClient} />
      </QueryClientProvider>
    );

    // Find the bookmark button by its aria-label
    const bookmarkButton = screen.getByLabelText(/save for later/i);
    await userEvent.click(bookmarkButton);

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['feedItems'] });
  });
}); 