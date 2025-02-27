import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';

/**
 * Props for the AddFeedDialog component
 */
interface AddFeedDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Callback when a new feed URL is submitted */
  onSubmit: (feedUrl: string) => void;
  /** Whether the dialog is in a loading state */
  isLoading: boolean;
}

/**
 * Dialog component for adding a new RSS feed.
 * Provides a form with URL validation and loading state handling.
 * 
 * Features:
 * - URL input field with validation
 * - Loading state with spinner
 * - Cancel and submit buttons
 * - Form submission handling
 * 
 * @component
 * @example
 * ```tsx
 * <AddFeedDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSubmit={(url) => handleAddFeed(url)}
 *   isLoading={false}
 * />
 * ```
 */
export const AddFeedDialog: React.FC<AddFeedDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [feedUrl, setFeedUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validateUrl(feedUrl)) {
      setError('Please enter a valid URL');
      return;
    }
    onSubmit(feedUrl);
    setFeedUrl('');
    setError(null);
    setTouched(false);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setFeedUrl(newUrl);
    
    if (touched) {
      setError(validateUrl(newUrl) ? null : 'Please enter a valid URL');
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (feedUrl) {
      setError(validateUrl(feedUrl) ? null : 'Please enter a valid URL');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add New Feed</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Feed URL"
            type="url"
            fullWidth
            value={feedUrl}
            onChange={handleUrlChange}
            onBlur={handleBlur}
            required
            disabled={isLoading}
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!feedUrl || isLoading}
            aria-label="add feed"
            data-testid="submit-feed"
          >
            {isLoading ? <CircularProgress size={24} /> : 'Add Feed'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}; 