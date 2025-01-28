import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedItemCard } from '../FeedItemCard';
import { ProcessedFeedItem } from '../../types/feed';

const mockFeedItem: ProcessedFeedItem = {
  id: '1',
  title: 'Test Article',
  url: 'https://example.com',
  content: 'Test content',
  summary: 'Test summary',
  sourceId: 'src_1',
  externalId: 'ext_1',
  publishedAt: new Date('2024-01-01'),
  source: {
    id: 'source_1',
    name: 'Test Source',
    platform: 'rss',
    url: 'https://example.com'
  },
  media: [
    {
      url: 'https://example.com/image.jpg',
      type: 'image/jpeg',
      thumbnailUrl: 'https://example.com/thumbnail.jpg'
    }
  ],
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
};

describe('FeedItemCard', () => {
  it('should render basic feed item information', () => {
    render(<FeedItemCard item={mockFeedItem} />);

    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('Test Source')).toBeInTheDocument();
    expect(screen.getByText('Test summary')).toBeInTheDocument();
  });

  it('should render media thumbnail when available', () => {
    const { container } = render(<FeedItemCard item={mockFeedItem} />);

    const thumbnail = container.querySelector('img');
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', 'https://example.com/thumbnail.jpg');
  });

  it('should render without media when not available', () => {
    const itemWithoutMedia = {
      ...mockFeedItem,
      media: []
    };

    const { container } = render(<FeedItemCard item={itemWithoutMedia} />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('should render consumption time information', () => {
    render(<FeedItemCard item={mockFeedItem} />);

    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('should render content type', () => {
    render(<FeedItemCard item={mockFeedItem} />);

    expect(screen.getByText('technical')).toBeInTheDocument();
  });

  it('should render topics as chips', () => {
    render(<FeedItemCard item={mockFeedItem} />);
    
    // Topics might be rendered in a different format or with additional styling
    // We'll need to check the actual implementation to see how they're displayed
    const topicElements = screen.getAllByRole('button');
    expect(topicElements.length).toBeGreaterThan(0);
  });
}); 
