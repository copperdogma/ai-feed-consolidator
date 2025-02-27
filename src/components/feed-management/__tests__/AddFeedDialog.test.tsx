import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddFeedDialog } from '../AddFeedDialog';

describe('AddFeedDialog', () => {
  const mockHandlers = {
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <AddFeedDialog
        open={true}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={false}
      />
    );

    expect(screen.getByText('Add New Feed')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <AddFeedDialog
        open={false}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={false}
      />
    );

    expect(screen.queryByText('Add New Feed')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <AddFeedDialog
        open={true}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockHandlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('validates URL format', () => {
    render(
      <AddFeedDialog
        open={true}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={false}
      />
    );

    const urlInput = screen.getByRole('textbox');
    fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } });
    
    // Trigger validation by blurring the field
    fireEvent.blur(urlInput);

    // Check that the error message is displayed
    expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
    expect(urlInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables form submission while loading', () => {
    render(
      <AddFeedDialog
        open={true}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('submit-feed')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(
      <AddFeedDialog
        open={true}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={true}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('trims whitespace from URL input', () => {
    render(
      <AddFeedDialog
        open={true}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={false}
      />
    );

    const urlInput = screen.getByRole('textbox');
    fireEvent.change(urlInput, { target: { value: '  https://example.com/feed.xml  ' } });
    
    const submitButton = screen.getByTestId('submit-feed');
    fireEvent.click(submitButton);

    expect(mockHandlers.onSubmit).toHaveBeenCalledWith('https://example.com/feed.xml');
  });

  it('handles form submission with enter key', () => {
    render(
      <AddFeedDialog
        open={true}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={false}
      />
    );

    const urlInput = screen.getByRole('textbox');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/feed.xml' } });
    
    // Submit the form directly - no need to find it by role
    const form = urlInput.closest('form');
    if (!form) throw new Error('Form not found');
    fireEvent.submit(form);

    expect(mockHandlers.onSubmit).toHaveBeenCalledWith('https://example.com/feed.xml');
  });

  it('clears input after submission', () => {
    render(
      <AddFeedDialog
        open={true}
        onClose={mockHandlers.onClose}
        onSubmit={mockHandlers.onSubmit}
        isLoading={false}
      />
    );

    const urlInput = screen.getByRole('textbox');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/feed.xml' } });
    
    const submitButton = screen.getByTestId('submit-feed');
    fireEvent.click(submitButton);

    expect(urlInput).toHaveValue('');
  });
}); 