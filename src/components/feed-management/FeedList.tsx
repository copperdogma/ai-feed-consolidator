import React from 'react';
import { List, ListItem, Typography, Box } from '@mui/material';
import { Feed } from '../../types/feed-management';
import { FeedItem } from './FeedItem';

/**
 * Props for the FeedList component
 */
interface FeedListProps {
  /** Array of feeds to display */
  feeds: Feed[];
  /** Callback when a feed's active state is toggled */
  onToggleActive: (feed: Feed, newState: boolean) => void;
  /** Callback when a feed's refresh button is clicked */
  onRefresh: (id: number) => void;
  /** Callback when a feed's edit button is clicked */
  onEdit: (feed: Feed) => void;
  /** Callback when a feed's delete button is clicked */
  onDelete: (id: number) => void;
}

/**
 * Renders a list of feed items with consistent spacing and styling.
 * Delegates the rendering of individual feed items to the FeedItem component.
 * 
 * @component
 * @example
 * ```tsx
 * <FeedList
 *   feeds={feeds}
 *   onToggleActive={handleToggle}
 *   onRefresh={handleRefresh}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export const FeedList: React.FC<FeedListProps> = ({
  feeds,
  onToggleActive,
  onRefresh,
  onEdit,
  onDelete,
}) => {
  if (feeds.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No feeds available. Add your first feed to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {feeds.map((feed) => (
        <ListItem
          key={feed.id}
          disablePadding
          sx={{ mb: 2 }}
        >
          <FeedItem
            feed={feed}
            onToggleActive={onToggleActive}
            onRefresh={onRefresh}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </ListItem>
      ))}
    </List>
  );
}; 