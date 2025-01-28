import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { FeedItemCard } from './FeedItemCard';
import { useFeedItems } from '../hooks/useFeed';
import { QueryClient } from '@tanstack/react-query';

interface ErrorAlertProps {
  message: string;
}

const ErrorAlert = ({ message }: ErrorAlertProps) => (
  <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
    <Typography color="error.dark">{message}</Typography>
  </Box>
);

interface FeedDisplayProps {
  queryClient: QueryClient;
}

export const FeedDisplay: React.FC<FeedDisplayProps> = ({ queryClient }) => {
  const { data: feedItems, error: feedError, isLoading: feedLoading } = useFeedItems();

  if (feedLoading) {
    return <CircularProgress />;
  }

  if (feedError) {
    return <ErrorAlert message={feedError.message} />;
  }

  if (!feedItems?.length) {
    return <Typography>No feed items available</Typography>;
  }

  return (
    <Box sx={{ width: '100%' }}>
      {feedItems.map(item => (
        <FeedItemCard 
          key={item.id} 
          item={item} 
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['feedItems'] })}
        />
      ))}
    </Box>
  );
}; 