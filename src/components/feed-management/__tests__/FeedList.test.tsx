import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedList } from '../FeedList';
import type { Feed } from '../../../types/feed-management';

describe('FeedList', () => {
  const mockFeeds: Feed[] = [
    {
      id: 1,
      feedUrl: 'https://example1.com/feed.xml',
      title: 'Example Feed 1',
      description: 'First test feed',
      siteUrl: 'https://example1.com',
      iconUrl: 'https://example1.com/icon.png',
      lastFetchedAt: '2024-01-01T12:00:00Z',
      errorCount: 0,
      isActive: true,
      fetchIntervalMinutes: 60,
      updateFrequency: 'hourly',
    },
    {
      id: 2,
      feedUrl: 'https://example2.com/feed.xml',
      title: 'Example Feed 2',
      description: 'Second test feed',
      siteUrl: 'https://example2.com',
      iconUrl: 'https://example2.com/icon.png',
      lastFetchedAt: '2024-01-02T12:00:00Z',
      errorCount: 0,
      isActive: false,
      fetchIntervalMinutes: 120,
      updateFrequency: 'daily',
    },
  ];

  const mockHandlers = {
    onToggleActive: vi.fn(),
    onRefresh: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders a list of feeds', () => {
    render(<FeedList feeds={mockFeeds} {...mockHandlers} />);

    // Check if both feed titles are rendered
    expect(screen.getByText(mockFeeds[0].title!)).toBeInTheDocument();
    expect(screen.getByText(mockFeeds[1].title!)).toBeInTheDocument();

    // Check if both feed descriptions are rendered
    expect(screen.getByText(mockFeeds[0].description!)).toBeInTheDocument();
    expect(screen.getByText(mockFeeds[1].description!)).toBeInTheDocument();
  });

  it('renders an empty state when no feeds are provided', () => {
    render(<FeedList feeds={[]} {...mockHandlers} />);
    expect(screen.getByText('No feeds available. Add your first feed to get started.')).toBeInTheDocument();
  });

  it('renders feeds with correct active states', () => {
    render(<FeedList feeds={mockFeeds} {...mockHandlers} />);

    // Get all switches (one per feed)
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);

    // Check if the switches reflect the correct active states
    expect(switches[0]).toBeChecked(); // First feed is active
    expect(switches[1]).not.toBeChecked(); // Second feed is inactive
  });

  it('renders feeds with their descriptions', () => {
    render(<FeedList feeds={mockFeeds} {...mockHandlers} />);

    expect(screen.getByText(mockFeeds[0].description!)).toBeInTheDocument();
    expect(screen.getByText(mockFeeds[1].description!)).toBeInTheDocument();
  });

  it('renders feeds with their last fetched times', () => {
    render(<FeedList feeds={mockFeeds} {...mockHandlers} />);

    // Format dates as they would appear in the component
    const date1 = new Date(mockFeeds[0].lastFetchedAt!).toLocaleString();
    const date2 = new Date(mockFeeds[1].lastFetchedAt!).toLocaleString();

    expect(screen.getAllByText(`Last fetched: ${date1}`)).toHaveLength(1);
    expect(screen.getAllByText(`Last fetched: ${date2}`)).toHaveLength(1);
  });
}); 