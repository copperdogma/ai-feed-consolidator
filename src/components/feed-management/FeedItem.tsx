import React from 'react';
import {
  Paper,
  Stack,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Feed } from '../../types/feed-management';

/**
 * Props for the FeedItem component
 */
interface FeedItemProps {
  /** The feed to display */
  feed: Feed;
  /** Callback when the feed's active state is toggled */
  onToggleActive: (feed: Feed, newState: boolean) => void;
  /** Callback when the refresh button is clicked */
  onRefresh: (id: number) => void;
  /** Callback when the edit button is clicked */
  onEdit: (feed: Feed) => void;
  /** Callback when the delete button is clicked */
  onDelete: (id: number) => void;
}

/**
 * Displays a single feed item with its details and action buttons.
 * Provides controls for:
 * - Toggling feed active state
 * - Refreshing feed content
 * - Editing feed details
 * - Deleting the feed
 * 
 * Also displays feed metadata such as:
 * - Title
 * - Description (if available)
 * - Update frequency
 * - Error count (if any)
 * 
 * @component
 * @example
 * ```tsx
 * <FeedItem
 *   feed={feed}
 *   onToggleActive={(feed, newState) => handleToggle(feed, newState)}
 *   onRefresh={(id) => handleRefresh(id)}
 *   onEdit={(feed) => handleEdit(feed)}
 *   onDelete={(id) => handleDelete(id)}
 * />
 * ```
 */
export const FeedItem: React.FC<FeedItemProps> = ({
  feed,
  onToggleActive,
  onRefresh,
  onEdit,
  onDelete,
}) => {
  const formatLastFetched = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleString();
  };

  return (
    <Paper sx={{ p: 2, width: '100%' }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{feed.title || feed.feedUrl}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={feed.isActive}
                  onChange={(e) => onToggleActive(feed, e.target.checked)}
                  role="switch"
                  aria-checked={feed.isActive}
                />
              }
              label="Active"
            />
            <IconButton
              onClick={() => onRefresh(feed.id)}
              title="Refresh feed now"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              onClick={() => onEdit(feed)}
              title="Edit feed"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={() => onDelete(feed.id)}
              title="Delete feed"
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        </Stack>
        {feed.description && (
          <Typography variant="body2" color="text.secondary">
            {feed.description}
          </Typography>
        )}
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            label={`Updates ${feed.updateFrequency}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          {feed.errorCount > 0 && (
            <Chip
              label={`${feed.errorCount} error${feed.errorCount > 1 ? 's' : ''}`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          {feed.lastFetchedAt && (
            <Typography variant="body2" color="text.secondary">
              Last fetched: {formatLastFetched(feed.lastFetchedAt)}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}; 