import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Feed {
  id: number;
  feedUrl: string;
  title?: string;
  description?: string;
  siteUrl?: string;
  iconUrl?: string;
  lastFetchedAt?: string;
  errorCount: number;
  isActive: boolean;
  fetchIntervalMinutes: number;
}

interface AddFeedDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedUrl: string) => void;
  isLoading: boolean;
}

interface EditFeedDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feed: Partial<Feed>) => void;
  feed: Feed;
  isLoading: boolean;
}

const AddFeedDialog: React.FC<AddFeedDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [feedUrl, setFeedUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(feedUrl);
    setFeedUrl('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add RSS Feed</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Feed URL"
            type="url"
            fullWidth
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            required
            disabled={isLoading}
            placeholder="https://example.com/feed.xml"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !feedUrl}>
            {isLoading ? <CircularProgress size={24} /> : 'Add Feed'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const EditFeedDialog: React.FC<EditFeedDialogProps> = ({
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
      title,
      description,
      isActive,
      fetchIntervalMinutes: fetchInterval,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Feed</DialogTitle>
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
          <TextField
            margin="dense"
            label="Fetch Interval (minutes)"
            type="number"
            fullWidth
            value={fetchInterval}
            onChange={(e) => setFetchInterval(parseInt(e.target.value, 10))}
            inputProps={{ min: 5, max: 1440 }}
            disabled={isLoading}
            helperText="Between 5 minutes and 24 hours"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export const FeedManagement: React.FC = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
  const queryClient = useQueryClient();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Fetch feeds
  const {
    data: feeds,
    isLoading,
    error,
  } = useQuery<Feed[]>({
    queryKey: ['feeds'],
    queryFn: async () => {
      const response = await fetch('/api/feeds');
      if (!response.ok) {
        throw new Error('Failed to fetch feeds');
      }
      return response.json();
    },
  });

  // Add feed mutation
  const addFeedMutation = useMutation<Feed, Error, string>({
    mutationFn: async (feedUrl: string) => {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedUrl }),
      });
      if (!response.ok) {
        throw new Error('Failed to add feed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      setAddDialogOpen(false);
    },
  });

  // Update feed mutation
  const updateFeedMutation = useMutation<
    Feed,
    Error,
    { id: number } & Partial<Feed>
  >({
    mutationFn: async ({ id, ...updates }) => {
      const response = await fetch(`/api/feeds/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update feed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      setEditDialogOpen(false);
    },
  });

  // Delete feed mutation
  const deleteFeedMutation = useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/feeds/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete feed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  // Add refresh mutation
  const refreshFeedMutation = useMutation<Feed, Error, number>({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/feeds/${id}/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || 'Failed to refresh feed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
    onError: (error) => {
      console.error('Failed to refresh feed:', error);
      // Show error in UI using alert instead of snackbar
      setRefreshError(error.message);
    }
  });

  // Add refresh handler
  const handleRefreshFeed = async (id: number) => {
    setRefreshError(null);
    try {
      await refreshFeedMutation.mutateAsync(id);
    } catch (error) {
      // Error is handled in onError
    }
  };

  // Add optimistic updates for toggle
  const handleToggleActive = async (feed: Feed, newState: boolean) => {
    console.log('Toggle requested:', { feedId: feed.id, oldState: feed.isActive, newState });
    
    // Store the current state for potential revert
    const currentState = feed.isActive ?? false;
    
    // Optimistically update the UI
    queryClient.setQueryData<Feed[]>(['feeds'], (old) => {
      const updated = old?.map(f => f.id === feed.id ? { ...f, isActive: newState } : f) ?? [];
      console.log('Optimistic update:', { feedId: feed.id, newState, feeds: updated });
      return updated;
    });
    
    try {
      // Make the API call
      const response = await fetch(`/api/feeds/${feed.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newState }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update feed');
      }
      
      const updatedFeed = await response.json();
      console.log('API response:', { feedId: feed.id, serverState: updatedFeed.isActive });
      
      if (updatedFeed.isActive === undefined) {
        throw new Error('Invalid server response');
      }
      
      // Update with the server response
      queryClient.setQueryData<Feed[]>(['feeds'], (old) => 
        old?.map(f => f.id === feed.id ? { ...f, ...updatedFeed } : f) ?? []
      );
    } catch (error) {
      console.error('Toggle failed:', { feedId: feed.id, error });
      // Revert optimistic update on error
      queryClient.setQueryData<Feed[]>(['feeds'], (old) => 
        old?.map(f => f.id === feed.id ? { ...f, isActive: currentState } : f) ?? []
      );
    }
  };

  const handleAddFeed = (feedUrl: string) => {
    addFeedMutation.mutate(feedUrl);
  };

  const handleEditFeed = (updates: Partial<Feed>) => {
    if (!selectedFeed) return;
    updateFeedMutation.mutate({ id: selectedFeed.id, ...updates });
  };

  const handleDeleteFeed = (id: number) => {
    if (window.confirm('Are you sure you want to delete this feed?')) {
      deleteFeedMutation.mutate(id);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          RSS Feeds
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Feed
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load feeds
        </Alert>
      )}

      {addFeedMutation.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to add feed
        </Alert>
      )}

      {refreshError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setRefreshError(null)}>
          {refreshError}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {feeds?.map((feed) => (
            <Card key={feed.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {feed.iconUrl && (
                    <Box
                      component="img"
                      src={feed.iconUrl}
                      alt=""
                      sx={{ width: 24, height: 24, mr: 1 }}
                    />
                  )}
                  <Typography variant="h6" component="h2">
                    {feed.title || feed.feedUrl}
                  </Typography>
                </Box>

                {feed.description && (
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    {feed.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {feed.fetchIntervalMinutes !== undefined ? 
                      feed.fetchIntervalMinutes === 60
                        ? 'Updates hourly'
                        : feed.fetchIntervalMinutes < 60
                          ? `Updates every ${feed.fetchIntervalMinutes} minutes`
                          : `Updates every ${Math.round(feed.fetchIntervalMinutes / 60)} hours`
                      : 'Update interval not set'}
                  </Typography>
                  {feed.errorCount > 0 && (
                    <Typography
                      variant="body2"
                      color="error"
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <WarningIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      {feed.errorCount} fetch errors
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={feed.isActive ?? false}
                          onChange={(e) => handleToggleActive(feed, e.target.checked)}
                        />
                      }
                      label={feed.isActive ? 'Active' : 'Inactive'}
                      sx={{ minWidth: 100 }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Tooltip title={refreshFeedMutation.isPending ? 'Refreshing...' : 'Refresh feed now'}>
                    <span>
                      <IconButton
                        onClick={() => handleRefreshFeed(feed.id)}
                        disabled={refreshFeedMutation.isPending}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <IconButton
                    onClick={() => {
                      setSelectedFeed(feed);
                      setEditDialogOpen(true);
                    }}
                    title="Edit feed settings"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteFeed(feed.id)}
                    title="Delete feed"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      <AddFeedDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleAddFeed}
        isLoading={addFeedMutation.status === 'pending'}
      />

      {selectedFeed && (
        <EditFeedDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSubmit={handleEditFeed}
          feed={selectedFeed}
          isLoading={updateFeedMutation.status === 'pending'}
        />
      )}
    </Box>
  );
}; 