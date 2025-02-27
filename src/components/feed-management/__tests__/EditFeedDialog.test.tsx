import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditFeedDialog } from '../EditFeedDialog';
import type { Feed } from '../../../types/feed-management';

describe('EditFeedDialog', () => {
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
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open with feed data', () => {
    render(
      <EditFeedDialog
        open={true}
        isLoading={false}
        feed={mockFeed}
        {...mockHandlers}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit RSS Feed')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue(mockFeed.title || '');
    expect(screen.getByLabelText(/description/i)).toHaveValue(mockFeed.description || '');
    expect(screen.getByLabelText(/fetch interval/i)).toHaveValue(mockFeed.fetchIntervalMinutes);
  });

  it('does not render when closed', () => {
    render(
      <EditFeedDialog
        open={false}
        isLoading={false}
        feed={mockFeed}
        {...mockHandlers}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <EditFeedDialog
        open={true}
        isLoading={false}
        feed={mockFeed}
        {...mockHandlers}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('disables form submission while loading', () => {
    render(
      <EditFeedDialog
        open={true}
        isLoading={true}
        feed={mockFeed}
        {...mockHandlers}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const saveButton = screen.getByRole('button', { name: /save changes/i });

    expect(saveButton).toBeDisabled();
    expect(titleInput).toBeDisabled();
    expect(descriptionInput).toBeDisabled();
  });

  it('shows loading state', () => {
    render(
      <EditFeedDialog
        open={true}
        isLoading={true}
        feed={mockFeed}
        {...mockHandlers}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('trims whitespace from inputs', () => {
    render(
      <EditFeedDialog
        open={true}
        isLoading={false}
        feed={mockFeed}
        {...mockHandlers}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const form = screen.getByRole('form');

    fireEvent.change(titleInput, { target: { value: '  New Title  ' } });
    fireEvent.change(descriptionInput, { target: { value: '  New Description  ' } });
    
    // Submit the form
    fireEvent.submit(form);

    expect(mockHandlers.onSubmit).toHaveBeenCalledWith({
      title: 'New Title',
      description: 'New Description',
      isActive: true,
      fetchIntervalMinutes: 60
    });
  });

  it('handles form submission with enter key', () => {
    render(<EditFeedDialog open={true} isLoading={false} feed={mockFeed} {...mockHandlers} />);

    const titleInput = screen.getByLabelText(/title/i);
    const form = titleInput.closest('form');
    
    if (!form) throw new Error('Form not found');
    
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    fireEvent.submit(form);

    expect(mockHandlers.onSubmit).toHaveBeenCalledWith({
      title: 'New Title',
      description: mockFeed.description,
      isActive: true,
      fetchIntervalMinutes: 60
    });
  });
}); 