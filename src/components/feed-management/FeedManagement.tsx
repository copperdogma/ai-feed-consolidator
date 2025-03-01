import React, { useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { Feed } from '../../types/feed-management';
import { useFeedManagement } from '../../hooks/useFeedManagement';
import { FeedList } from './FeedList';
import { AddFeedDialog } from './AddFeedDialog';
import { EditFeedDialog } from './EditFeedDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ImportDialog } from './ImportDialog';

/**
 * Props for the FeedManagement component
 */
interface FeedManagementProps {
  /** Initial list of feeds to display. If not provided, feeds will be fetched from the API */
  initialFeeds?: Feed[];
  /** Whether the component is in a loading state */
  loading?: boolean;
}

/**
 * Main component for managing RSS feeds. Provides functionality for:
 * - Viewing a list of feeds
 * - Adding new feeds
 * - Editing existing feeds
 * - Deleting feeds
 * - Importing feeds from OPML files
 * - Toggling feed active state
 * - Refreshing feeds
 * 
 * @component
 * @example
 * ```tsx
 * <FeedManagement
 *   initialFeeds={[]}
 *   loading={false}
 * />
 * ```
 */
export const FeedManagement: React.FC<FeedManagementProps> = ({
  initialFeeds = [],
  loading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    feeds,
    addDialogOpen,
    editDialogOpen,
    selectedFeed,
    deleteDialogOpen,
    importResult,
    setAddDialogOpen,
    setEditDialogOpen,
    setSelectedFeed,
    setDeleteDialogOpen,
    setImportResult,
    handleAddFeed,
    handleEditFeed,
    handleDeleteClick,
    handleDeleteConfirm,
    handleToggleActive,
    handleRefreshFeed,
    handleImportOPML,
  } = useFeedManagement(initialFeeds);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress data-testid="loading-skeleton" />
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Feed Management</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={() => setAddDialogOpen(true)}
              startIcon={<AddIcon />}
            >
              Add Feed
            </Button>
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              startIcon={<FileUploadIcon />}
            >
              Import OPML
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportOPML(file);
                }
              }}
              style={{ display: 'none' }}
              accept=".opml,.xml"
              data-testid="opml-input"
            />
          </Stack>
        </Stack>
      </Paper>

      <FeedList
        feeds={feeds}
        onToggleActive={handleToggleActive}
        onRefresh={handleRefreshFeed}
        onEdit={(feed) => {
          setSelectedFeed(feed);
          setEditDialogOpen(true);
        }}
        onDelete={handleDeleteClick}
      />

      <AddFeedDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleAddFeed}
        isLoading={false}
      />

      {selectedFeed && (
        <EditFeedDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedFeed(null);
          }}
          onSubmit={handleEditFeed}
          feed={selectedFeed}
          isLoading={false}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      {importResult && (
        <ImportDialog
          open={!!importResult}
          onClose={() => setImportResult(null)}
          result={importResult}
        />
      )}
    </Box>
  );
}; 