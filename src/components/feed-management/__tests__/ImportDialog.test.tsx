import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportDialog } from '../ImportDialog';
import type { ImportResult } from '../../../types/feed-management';

describe('ImportDialog', () => {
  const mockResult: ImportResult = {
    added: 2,
    skipped: 1,
    errors: [
      'Failed to import feed: https://example4.com/feed.xml - Invalid feed format',
    ],
  };

  const mockHandlers = {
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open with import results', () => {
    render(
      <ImportDialog
        open={true}
        result={mockResult}
        {...mockHandlers}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/import results/i)).toBeInTheDocument();

    // Check successful imports
    expect(screen.getByText(/Successfully added 2 feeds./i)).toBeInTheDocument();

    // Check skipped feeds
    expect(screen.getByText(/Skipped 1 duplicate feed./i)).toBeInTheDocument();

    // Check failed imports
    expect(screen.getByText(/Failed to import 1 feed:/i)).toBeInTheDocument();
    expect(screen.getByText(mockResult.errors[0])).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ImportDialog
        open={false}
        result={mockResult}
        {...mockHandlers}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ImportDialog
        open={true}
        result={mockResult}
        {...mockHandlers}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside the dialog', () => {
    render(
      <ImportDialog
        open={true}
        result={mockResult}
        {...mockHandlers}
      />
    );

    const dialogs = screen.getAllByRole('presentation');
    const rootDialog = dialogs.find(dialog => dialog.classList.contains('MuiDialog-root'));
    if (!rootDialog) throw new Error('Root dialog not found');
    const backdrop = rootDialog.querySelector('.MuiBackdrop-root');
    if (!backdrop) throw new Error('Backdrop not found');
    
    fireEvent.click(backdrop);

    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('calls onClose when pressing escape key', () => {
    render(
      <ImportDialog
        open={true}
        result={mockResult}
        {...mockHandlers}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('handles empty result sections', () => {
    const emptyResult: ImportResult = {
      added: 0,
      skipped: 0,
      errors: [],
    };

    render(
      <ImportDialog
        open={true}
        result={emptyResult}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/Successfully added 0 feeds./i)).toBeInTheDocument();
    expect(screen.queryByText(/Skipped/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Failed to import/i)).not.toBeInTheDocument();
  });
}); 