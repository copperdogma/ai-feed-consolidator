import React from 'react';
import { Box, CircularProgress, Typography, Button, Skeleton } from '@mui/material';
import { FeedItemCard } from './FeedItemCard';
import { useFeedItems } from '../hooks/useFeed';
import { QueryClient } from '@tanstack/react-query';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorAlertProps {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}

const ErrorAlert = ({ message, onRetry, isRetrying }: ErrorAlertProps) => (
  <Box sx={{ 
    mb: 3, 
    p: 3, 
    bgcolor: 'error.light', 
    borderRadius: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ErrorOutlineIcon color="error" />
      <Typography color="error.dark">{message}</Typography>
    </Box>
    <Button
      variant="contained"
      color="primary"
      onClick={onRetry}
      disabled={isRetrying}
      startIcon={isRetrying ? <CircularProgress size={20} /> : <RefreshIcon />}
    >
      {isRetrying ? 'Retrying...' : 'Retry'}
    </Button>
  </Box>
);

const LoadingSkeleton = () => (
  <Box sx={{ width: '100%' }} data-testid="loading-skeleton">
    {[1, 2, 3].map((key) => (
      <Box
        key={key}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Skeleton variant="rectangular" width={100} height={100} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Skeleton variant="rounded" width={80} height={20} />
              <Skeleton variant="rounded" width={60} height={20} />
              <Skeleton variant="rounded" width={120} height={20} />
            </Box>
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="85%" />
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
);

interface FeedDisplayProps {
  queryClient: QueryClient;
}

export const FeedDisplay: React.FC<FeedDisplayProps> = ({ queryClient }) => {
  const { 
    data: feedItems, 
    error: feedError, 
    isLoading: feedLoading,
    isError,
    refetch,
    isRefetching
  } = useFeedItems();

  if (feedLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <ErrorAlert 
        message={feedError?.message || 'Failed to load feed items'} 
        onRetry={() => refetch()} 
        isRetrying={isRefetching}
      />
    );
  }

  if (!feedItems?.length) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: 2,
        p: 3 
      }}>
        <Typography variant="h6">No feed items available</Typography>
        <Button
          variant="outlined"
          onClick={() => refetch()}
          startIcon={isRefetching ? <CircularProgress size={20} /> : <RefreshIcon />}
          disabled={isRefetching}
        >
          Refresh
        </Button>
      </Box>
    );
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