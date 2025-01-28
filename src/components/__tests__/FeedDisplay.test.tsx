import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedDisplay } from '../FeedDisplay';
import { useFeedItems } from '../../hooks/useFeed';

// Mock the useFeedItems hook
vi.mock('../../hooks/useFeed', () => ({
  useFeedItems: vi.fn()
}));

const mockFeedItems = [
  {
    id: '1',
    title: 'Test Article 1',
    url: 'https://example.com/1',
    content: 'Test content 1',
    summary: 'Test summary 1',
    sourceId: 'src_1',
    externalId: 'ext_1',
    publishedAt: new Date('2024-01-01'),
    source: {
      id: 'source_1',
      name: 'Test Source',
      platform: 'rss',
      url: 'https://example.com'
    },
    media: [],
    topics: ['tech'],
    feedConfigId: 1,
    content_type: 'technical',
    time_sensitive: false,
    requires_background: [],
    consumption_time: {
      minutes: 5,
      type: 'read'
    },
    processedAt: new Date('2024-01-01')
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

  it('should show loading state', () => {
    vi.mocked(useFeedItems).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isError: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <FeedDisplay queryClient={queryClient} />
      </QueryClientProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error message', () => {
    const errorMessage = 'Failed to load feed items';
    vi.mocked(useFeedItems).mockReturnValue({
      data: undefined,
      error: new Error(errorMessage),
      isLoading: false,
      isError: true,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <FeedDisplay queryClient={queryClient} />
      </QueryClientProvider>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should show no items message when feed is empty', () => {
    vi.mocked(useFeedItems).mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      isError: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <FeedDisplay queryClient={queryClient} />
      </QueryClientProvider>
    );

    expect(screen.getByText('No feed items available')).toBeInTheDocument();
  });

  it('should render feed items', () => {
    vi.mocked(useFeedItems).mockReturnValue({
      data: mockFeedItems,
      error: null,
      isLoading: false,
      isError: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <FeedDisplay queryClient={queryClient} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    expect(screen.getByText('Test Source')).toBeInTheDocument();
    expect(screen.getByText('Test summary 1')).toBeInTheDocument();
  });
}); 