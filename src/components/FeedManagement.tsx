import React, { useState, useEffect, useRef } from 'react';
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
  Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import FileUploadIcon from '@mui/icons-material/FileUpload';
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

interface APIError {
  message: string;
  details?: string;
  status?: number;
  code?: string;
  retryable?: boolean;
}

interface MutationContext {
  previousFeeds?: Feed[];
}

interface ImportResult {
  added: number;
  failed: number;
  errors: Array<{ url: string; error: string }>;
}

async function handleAPIResponse(response: Response, errorMessage: string): Promise<any> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.message || errorMessage,
      details: errorData.details || response.headers.get('Retry-After'),
      status: response.status,
      code: errorData.code,
      retryable: errorData.retryable,
    };

    if (response.status === 401) {
      error.message = 'Please log in to continue';
      error.retryable = false;
    } else if (response.status === 403) {
      error.message = 'You do not have permission to perform this action';
      error.retryable = false;
    } else if (response.status === 429) {
      error.message = 'Rate limit exceeded. Please try again later.';
      error.retryable = true;
    }

    throw error;
  }

  return response.json();
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

const ImportResultDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  result: ImportResult;
}> = ({ open, onClose, result }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Import Results</DialogTitle>
    <DialogContent>
      <Typography variant="body1" gutterBottom>
        Successfully imported {result.added} feed{result.added !== 1 ? 's' : ''}.
      </Typography>
      {result.failed > 0 && (
        <>
          <Typography variant="body1" color="error" gutterBottom>
            Failed to import {result.failed} feed{result.failed !== 1 ? 's' : ''}.
          </Typography>
          <List>
            {result.errors.map((error, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={error.url}
                  secondary={error.error}
                  secondaryTypographyProps={{ color: 'error' }}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

const LoadingSkeleton = () => (
  <List>
    {[1, 2, 3].map((key) => (
      <Card key={key} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Skeleton
              variant="circular"
              width={24}
              height={24}
              sx={{ mr: 1 }}
              data-testid="skeleton"
            />
            <Skeleton
              variant="text"
              width="60%"
              height={32}
              data-testid="skeleton"
            />
          </Box>
          <Skeleton
            variant="text"
            width="80%"
            sx={{ mb: 1 }}
            data-testid="skeleton"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton
              variant="text"
              width={120}
              data-testid="skeleton"
            />
            <Skeleton
              variant="text"
              width={100}
              data-testid="skeleton"
            />
            <Box sx={{ flex: 1 }} />
            <Skeleton
              variant="rounded"
              width={100}
              height={24}
              data-testid="skeleton"
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              sx={{ mr: 1 }}
              data-testid="skeleton"
            />
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              sx={{ mr: 1 }}
              data-testid="skeleton"
            />
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              data-testid="skeleton"
            />
          </Box>
        </CardContent>
      </Card>
    ))}
  </List>
);

export const FeedManagement: React.FC = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
  const queryClient = useQueryClient();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch feeds
  const {
    data: feeds,
    isLoading,
    error,
  } = useQuery<Feed[], APIError>({
    queryKey: ['feeds'],
    queryFn: async () => {
      const response = await fetch('/api/feeds');
      return handleAPIResponse(response, 'Failed to fetch feeds');
    },
  });

  // Add feed mutation
  const addFeedMutation = useMutation<Feed, APIError, string>({
    mutationFn: async (feedUrl: string) => {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedUrl }),
      });
      return handleAPIResponse(response, 'Failed to add feed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      setAddDialogOpen(false);
    },
    retry: (failureCount, error) => {
      if (!error.retryable) return false;
      return failureCount < 3;
    },
  });

  // Update feed mutation
  const updateFeedMutation = useMutation<Feed, APIError, { id: number } & Partial<Feed>, MutationContext>({
    mutationFn: async ({ id, ...updates }) => {
      const response = await fetch(`/api/feeds/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      return handleAPIResponse(response, 'Failed to update feed');
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['feeds'] });
      const previousFeeds = queryClient.getQueryData<Feed[]>(['feeds']);
      
      queryClient.setQueryData<Feed[]>(['feeds'], old => 
        old?.map(feed => feed.id === id ? { ...feed, ...updates } : feed) ?? []
      );
      
      return { previousFeeds };
    },
    onError: (err, variables, context) => {
      if (context?.previousFeeds) {
        queryClient.setQueryData(['feeds'], context.previousFeeds);
      }
    },
    onSuccess: () => {
      setEditDialogOpen(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  // Delete feed mutation
  const deleteFeedMutation = useMutation<void, APIError, number, MutationContext>({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/feeds/${id}`, {
        method: 'DELETE',
      });
      return handleAPIResponse(response, 'Failed to delete feed');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['feeds'] });
      const previousFeeds = queryClient.getQueryData<Feed[]>(['feeds']);
      
      queryClient.setQueryData<Feed[]>(['feeds'], old => 
        old?.filter(feed => feed.id !== id) ?? []
      );
      
      return { previousFeeds };
    },
    onError: (err, variables, context) => {
      if (context?.previousFeeds) {
        queryClient.setQueryData(['feeds'], context.previousFeeds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  // Refresh feed mutation
  const refreshFeedMutation = useMutation<Feed, APIError, number>({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/feeds/${id}/refresh`, {
        method: 'POST'
      });
      return handleAPIResponse(response, 'Failed to refresh feed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
    onError: (error) => {
      console.error('Failed to refresh feed:', error);
      setRefreshError(error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation<Feed, APIError, { id: number; isActive: boolean }, MutationContext>({
    mutationFn: async ({ id, isActive }) => {
      const response = await fetch(`/api/feeds/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });
      return handleAPIResponse(response, 'Failed to update feed');
    },
    onMutate: async ({ id, isActive }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['feeds'] });

      // Snapshot the previous value
      const previousFeeds = queryClient.getQueryData<Feed[]>(['feeds']);

      // Optimistically update to the new value
      queryClient.setQueryData<Feed[]>(['feeds'], old => 
        old?.map(feed => feed.id === id ? { ...feed, isActive } : feed) ?? []
      );

      // Return context with the previous value
      return { previousFeeds };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFeeds) {
        queryClient.setQueryData(['feeds'], context.previousFeeds);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync with server
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  // Replace handleToggleActive with simpler version using mutation
  const handleToggleActive = (feed: Feed, newState: boolean) => {
    toggleActiveMutation.mutate({ id: feed.id, isActive: newState });
  };

  // Add refresh handler
  const handleRefreshFeed = (id: number) => {
    setRefreshError(null);
    refreshFeedMutation.mutate(id);
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

  const importOPML = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/feeds/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import OPML file');
      }

      const result = await response.json();
      setImportResult(result);
      
      // Refresh feed list if any feeds were added
      if (result.added > 0) {
        queryClient.invalidateQueries({ queryKey: ['feeds'] });
      }
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Failed to import OPML file');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importOPML(file);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          RSS Feeds
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <input
            type="file"
            accept=".opml,.xml"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import OPML
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Feed
          </Button>
        </Box>
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

      {importResult && (
        <ImportResultDialog
          open={true}
          onClose={() => setImportResult(null)}
          result={importResult}
        />
      )}

      {isLoading ? (
        <LoadingSkeleton />
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