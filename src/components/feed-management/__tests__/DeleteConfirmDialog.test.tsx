import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { vi } from 'vitest';

const mockHandlers = {
  onClose: vi.fn(),
  onConfirm: vi.fn(),
};

describe('DeleteConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onClose when clicking outside the dialog', () => {
    render(<DeleteConfirmDialog open={true} {...mockHandlers} />);

    // Find the backdrop by its class name
    const backdrop = document.querySelector('.MuiBackdrop-root');
    if (!backdrop) throw new Error('Backdrop not found');
    
    // Use fireEvent instead of userEvent for synchronous execution
    fireEvent.click(backdrop);

    expect(mockHandlers.onClose).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking the Cancel button', () => {
    render(<DeleteConfirmDialog open={true} {...mockHandlers} />);

    const cancelButton = screen.getByText('Cancel');
    
    // Use fireEvent instead of userEvent for synchronous execution
    fireEvent.click(cancelButton);

    expect(mockHandlers.onClose).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when clicking the Delete button', () => {
    render(<DeleteConfirmDialog open={true} {...mockHandlers} />);

    const deleteButton = screen.getByText('Delete');
    
    // Use fireEvent instead of userEvent for synchronous execution
    fireEvent.click(deleteButton);

    expect(mockHandlers.onConfirm).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onClose).not.toHaveBeenCalled();
  });

  it('displays warning message', () => {
    render(<DeleteConfirmDialog open={true} {...mockHandlers} />);

    expect(screen.getByText('Are you sure you want to delete this feed?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<DeleteConfirmDialog open={false} {...mockHandlers} />);

    expect(screen.queryByText('Delete Feed')).not.toBeInTheDocument();
  });
}); 