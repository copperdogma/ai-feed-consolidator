import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedItem } from '../FeedItem';
import type { Feed } from '../../../types/feed-management';

describe('FeedItem', () => {
  const mockFeed: Feed = {
    id: 1,
    feedUrl: 'https://example.com/feed.xml',
    title: 'Example Feed',
    description: 'A test feed',
    siteUrl: 'https://example.com',
    iconUrl: 'https://example.com/icon.png',
    lastFetchedAt: new Date().toISOString(),
    errorCount: 0,
    isActive: true,
    fetchIntervalMinutes: 60,
    updateFrequency: 'hourly',
  };

  const mockHandlers = {
    onToggleActive: vi.fn(),
    onRefresh: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders feed information correctly', () => {
    render(<FeedItem feed={mockFeed} {...mockHandlers} />);

    expect(screen.getByText(mockFeed.title!)).toBeInTheDocument();
    expect(screen.getByText(mockFeed.description!)).toBeInTheDocument();
    expect(screen.getByText('Updates hourly')).toBeInTheDocument();
  });

  it('calls onToggleActive when toggle button is clicked', () => {
    render(<FeedItem feed={mockFeed} {...mockHandlers} />);

    const toggleButton = screen.getByRole('switch');
    fireEvent.click(toggleButton);

    expect(mockHandlers.onToggleActive).toHaveBeenCalledWith(mockFeed, false);
  });

  it('calls onRefresh when refresh button is clicked', () => {
    render(<FeedItem feed={mockFeed} {...mockHandlers} />);

    const refreshButton = screen.getByTitle('Refresh feed now');
    fireEvent.click(refreshButton);

    expect(mockHandlers.onRefresh).toHaveBeenCalledWith(mockFeed.id);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<FeedItem feed={mockFeed} {...mockHandlers} />);

    const editButton = screen.getByTitle('Edit feed');
    fireEvent.click(editButton);

    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockFeed);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<FeedItem feed={mockFeed} {...mockHandlers} />);

    const deleteButton = screen.getByTitle('Delete feed');
    fireEvent.click(deleteButton);

    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockFeed.id);
  });

  it('displays last fetched time correctly', () => {
    render(<FeedItem feed={mockFeed} {...mockHandlers} />);

    const formattedDate = new Date(mockFeed.lastFetchedAt!).toLocaleString();
    expect(screen.getByText(`Last fetched: ${formattedDate}`)).toBeInTheDocument();
  });
}); 