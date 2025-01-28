import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedManagement } from '../FeedManagement';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a wrapper with React Query provider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('FeedManagement', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders loading state initially', () => {
    render(<FeedManagement />, { wrapper: createWrapper() });
    
    expect(screen.getAllByTestId('skeleton')).toHaveLength(27);
  });

  it('renders feed list when data is loaded', async () => {
    const mockFeeds = [
      {
        id: 1,
        feedUrl: 'https://example.com/feed.xml',
        title: 'Example Feed',
        description: 'A test feed',
        isActive: true,
        errorCount: 0,
        fetchIntervalMinutes: 60,
      },
    ];

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFeeds),
      })
    );

    render(<FeedManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Example Feed')).toBeInTheDocument();
    });
  });

  it('opens add feed dialog when clicking add button', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    render(<FeedManagement />, { wrapper: createWrapper() });

    const addButton = screen.getByText('Add Feed');
    fireEvent.click(addButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /feed url/i })).toBeInTheDocument();
  });

  it('submits new feed successfully', async () => {
    const user = userEvent.setup();
    const newFeed = {
      id: 1,
      feedUrl: 'https://example.com/feed.xml',
      title: 'New Feed',
      isActive: true,
      errorCount: 0,
      fetchIntervalMinutes: 60,
    };

    // Mock initial feeds fetch
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    // Mock feed creation
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(newFeed),
      })
    );

    // Mock feeds refetch after creation
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([newFeed]),
      })
    );

    render(<FeedManagement />, { wrapper: createWrapper() });

    // Open dialog
    const addButton = screen.getByText('Add Feed');
    await user.click(addButton);

    // Fill and submit form
    const urlInput = screen.getByRole('textbox', { name: /feed url/i });
    await user.type(urlInput, 'https://example.com/feed.xml');
    const submitButton = screen.getByRole('button', { name: /add feed/i });
    await user.click(submitButton);

    // Verify the new feed is displayed
    await waitFor(() => {
      expect(screen.getByText('New Feed')).toBeInTheDocument();
    });
  });
}); 