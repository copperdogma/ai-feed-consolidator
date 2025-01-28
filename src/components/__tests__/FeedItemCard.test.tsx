import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedItemCard } from '../FeedItemCard';
import { ProcessedFeedItem } from '../../types/feed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFeedItem: ProcessedFeedItem = {
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
  processedAt: new Date()
};

describe('FeedItemCard', () => {
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

  beforeEach(() => {
    queryClient.clear();
  });

  it('should render basic feed item information', () => {
    renderWithClient(<FeedItemCard item={mockFeedItem} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('Test Source')).toBeInTheDocument();
    expect(screen.getByText('Test summary')).toBeInTheDocument();
  });

  it('should render media thumbnail when available', () => {
    const itemWithMedia = {
      ...mockFeedItem,
      media: [{ type: 'image', url: 'https://example.com/thumb.jpg', thumbnailUrl: 'https://example.com/thumb.jpg' }]
    };
    renderWithClient(<FeedItemCard item={itemWithMedia} />);
    const image = screen.getByAltText('');
    expect(image).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  it('should render without media when not available', () => {
    renderWithClient(<FeedItemCard item={mockFeedItem} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should render consumption time information', () => {
    renderWithClient(<FeedItemCard item={mockFeedItem} />);
    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('should render content type', () => {
    renderWithClient(<FeedItemCard item={mockFeedItem} />);
    expect(screen.getByText('technical')).toBeInTheDocument();
  });

  it('should render topics as chips', () => {
    renderWithClient(<FeedItemCard item={mockFeedItem} />);
    expect(screen.getByText('tech')).toBeInTheDocument();
    expect(screen.getByText('news')).toBeInTheDocument();
  });
}); 
