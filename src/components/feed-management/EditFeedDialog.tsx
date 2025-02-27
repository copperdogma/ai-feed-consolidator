import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { Feed } from '../../types/feed-management';

/**
 * Props for the EditFeedDialog component
 */
interface EditFeedDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Callback when feed updates are submitted */
  onSubmit: (feed: Partial<Feed>) => void;
  /** The feed being edited */
  feed: Feed;
  /** Whether the dialog is in a loading state */
  isLoading: boolean;
}

/**
 * Dialog component for editing an existing RSS feed.
 * Provides a form for modifying feed properties with loading state handling.
 * 
 * Editable properties:
 * - Title
 * - Description
 * - Active state
 * - Fetch interval
 * 
 * Features:
 * - Form pre-filled with current feed data
 * - Loading state with spinner
 * - Cancel and save buttons
 * - Form submission handling
 * - State synchronization with feed prop changes
 * 
 * @component
 * @example
 * ```tsx
 * <EditFeedDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSubmit={(updates) => handleUpdateFeed(updates)}
 *   feed={selectedFeed}
 *   isLoading={false}
 * />
 * ```
 */
export const EditFeedDialog: React.FC<EditFeedDialogProps> = ({
  open,
  onClose,
  onSubmit,
  feed,
  isLoading,
}) => {
  const [title, setTitle] = useState(feed.title || '');
  const [description, setDescription] = useState(feed.description || '');
  const [isActive, setIsActive] = useState(feed.isActive);
  const [fetchInterval, setFetchInterval] = useState(feed.fetchIntervalMinutes);

  useEffect(() => {
    setTitle(feed.title || '');
    setDescription(feed.description || '');
    setIsActive(feed.isActive);
    setFetchInterval(feed.fetchIntervalMinutes);
  }, [feed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      fetchIntervalMinutes: fetchInterval,
      isActive
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} role="form">
        <DialogTitle>Edit RSS Feed</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            margin="dense"
            label="Fetch Interval (minutes)"
            type="number"
            fullWidth
            value={fetchInterval}
            onChange={(e) => setFetchInterval(Number(e.target.value))}
            disabled={isLoading}
            inputProps={{ min: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isLoading}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} aria-label="Save Changes">
            {isLoading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}; 