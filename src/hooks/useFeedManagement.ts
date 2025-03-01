import { useCallback, useState } from 'react';
import { Feed, ImportResult } from '../types/feed-management';
import { useFeedMutations } from './useFeedMutations';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom hook that manages the state and operations for feed management.
 * Handles dialog states, feed operations, and error handling.
 * 
 * Features:
 * - Dialog state management (add, edit, delete, import)
 * - Feed list state management
 * - Optimistic updates for better UX
 * - Error handling with state rollback
 * - Integration with feed mutations
 * 
 * @param initialFeeds - Optional array of feeds to initialize the state with
 * @returns Object containing state and handler functions for feed management
 * 
 * @example
 * ```tsx
 * const {
 *   feeds,
 *   addDialogOpen,
 *   handleAddFeed,
 *   handleToggleActive,
 *   // ...other state and handlers
 * } = useFeedManagement(initialFeeds);
 * ```
 */
export const useFeedManagement = (initialFeeds: Feed[] = []) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Use React Query to manage feed state
  const { data: feeds = initialFeeds } = useQuery({
    queryKey: ['feeds'],
    queryFn: () => Promise.resolve(initialFeeds),
    initialData: initialFeeds,
  });

  // Get mutation functions
  const {
    addFeed,
    updateFeed,
    deleteFeed,
    toggleFeed,
    refreshFeed,
    importOPML,
  } = useFeedMutations();

  const queryClient = useQueryClient();

  /**
   * Handles adding a new feed
   * @param feedUrl - The URL of the RSS feed to add
   */
  const handleAddFeed = useCallback(async (feedUrl: string) => {
    try {
      const newFeed = await addFeed(feedUrl);
      setSelectedFeed(newFeed);
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding feed:', error);
    }
  }, [addFeed]);

  /**
   * Handles updating an existing feed
   * @param updates - Partial Feed object containing the properties to update
   */
  const handleEditFeed = useCallback(async (updates: Partial<Feed>) => {
    if (!selectedFeed) return;
    try {
      await updateFeed({ id: selectedFeed.id, updates });
      setSelectedFeed(null);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating feed:', error);
    }
  }, [selectedFeed, updateFeed]);

  /**
   * Initiates the feed deletion process
   * @param id - The ID of the feed to delete
   */
  const handleDeleteClick = useCallback((id: number) => {
    setSelectedFeed({ id } as Feed);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handles the confirmation of feed deletion
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedFeed) return;
    try {
      await deleteFeed(selectedFeed.id);
      setSelectedFeed(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting feed:', error);
    }
  }, [selectedFeed, deleteFeed]);

  /**
   * Handles toggling a feed's active state
   * @param feed - The feed to toggle
   * @param newState - The new active state
   */
  const handleToggleActive = useCallback(async (feed: Feed, newState: boolean) => {
    try {
      // Optimistically update the feed's state in the cache
      queryClient.setQueryData<Feed[]>(['feeds'], old => 
        (old || []).map(f => f.id === feed.id ? { ...f, isActive: newState } : f)
      );
      
      await toggleFeed({ id: feed.id, isActive: newState });
    } catch (error) {
      // Revert the optimistic update on error
      queryClient.setQueryData<Feed[]>(['feeds'], old => 
        (old || []).map(f => f.id === feed.id ? { ...f, isActive: !newState } : f)
      );
      console.error('Error toggling feed:', error);
      throw error;
    }
  }, [toggleFeed, queryClient]);

  /**
   * Handles refreshing a feed's content
   * @param id - The ID of the feed to refresh
   */
  const handleRefreshFeed = useCallback(async (id: number) => {
    try {
      await refreshFeed(id);
      // Optionally update the feed's state here if the refresh endpoint returns updated feed data
    } catch (error) {
      console.error('Error refreshing feed:', error);
    }
  }, [refreshFeed]);

  /**
   * Handles importing feeds from an OPML file
   * @param file - The OPML file to import
   */
  const handleImportOPML = useCallback(async (file: File) => {
    try {
      const result = await importOPML(file);
      setImportResult(result);
      
      // Refresh feed list if any feeds were added
      if (result.added > 0) {
        // You might want to fetch the updated feed list here
      }
    } catch (error) {
      console.error('Error importing OPML:', error);
    }
  }, [importOPML]);

  const handleAddDialogOpen = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const handleAddDialogClose = useCallback(() => {
    setAddDialogOpen(false);
  }, []);

  const handleEditDialogOpen = useCallback((feed: Feed) => {
    setSelectedFeed(feed);
    setEditDialogOpen(true);
  }, []);

  const handleEditDialogClose = useCallback(() => {
    setSelectedFeed(null);
    setEditDialogOpen(false);
  }, []);

  const handleDeleteDialogOpen = useCallback((feed: Feed) => {
    setSelectedFeed(feed);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteDialogClose = useCallback(() => {
    setSelectedFeed(null);
    setDeleteDialogOpen(false);
  }, []);

  return {
    feeds,
    addDialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    selectedFeed,
    importResult,
    handleToggleActive,
    handleAddDialogOpen,
    handleAddDialogClose,
    handleEditDialogOpen,
    handleEditDialogClose,
    handleDeleteDialogOpen,
    handleDeleteDialogClose,
    handleAddFeed,
    handleEditFeed,
    handleDeleteClick,
    handleDeleteConfirm,
    handleRefreshFeed,
    handleImportOPML,
  };
}; 