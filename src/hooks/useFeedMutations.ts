import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Feed, ImportResult } from '../types/feed-management';
import { handleAPIResponse } from '../utils/api-helpers';

interface MutationContext {
  previousFeeds?: Feed[];
}

/**
 * Custom hook that provides mutation functions for feed management operations.
 * Uses React Query for server state management and optimistic updates.
 * 
 * Features:
 * - Automatic cache invalidation after mutations
 * - Optimistic updates for better UX
 * - Error handling with typed responses
 * - Proper typing for all operations
 * 
 * @returns Object containing async mutation functions for feed operations
 * 
 * @example
 * ```tsx
 * const {
 *   addFeed,
 *   updateFeed,
 *   deleteFeed,
 *   toggleFeed,
 *   refreshFeed,
 *   importOPML
 * } = useFeedMutations();
 * 
 * // Add a new feed
 * await addFeed('https://example.com/feed.xml');
 * 
 * // Update an existing feed
 * await updateFeed(1, { title: 'New Title' });
 * ```
 */
export const useFeedMutations = () => {
  const queryClient = useQueryClient();

  /**
   * Adds a new feed to the system
   * @param feedUrl - The URL of the RSS feed to add
   * @returns Promise resolving to the newly created Feed object
   */
  const addFeed = useCallback(async (feedUrl: string): Promise<Feed> => {
    const response = await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedUrl }),
    });
    return handleAPIResponse(response, 'Failed to add feed');
  }, []);

  /**
   * Updates an existing feed's properties
   * @param id - The ID of the feed to update
   * @param updates - Partial Feed object containing the properties to update
   * @returns Promise resolving to the updated Feed object
   */
  const updateFeed = useCallback(async (id: number, updates: Partial<Feed>): Promise<Feed> => {
    const response = await fetch(`/api/feeds/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleAPIResponse(response, 'Failed to update feed');
  }, []);

  /**
   * Deletes a feed from the system
   * @param id - The ID of the feed to delete
   * @returns Promise resolving when the feed is deleted
   */
  const deleteFeed = useCallback(async (id: number): Promise<void> => {
    const response = await fetch(`/api/feeds/${id}`, {
      method: 'DELETE',
    });
    return handleAPIResponse(response, 'Failed to delete feed');
  }, []);

  /**
   * Toggles a feed's active state
   * @param id - The ID of the feed to toggle
   * @param isActive - The new active state
   * @returns Promise resolving when the state is updated
   */
  const toggleFeed = useCallback(async (id: number, isActive: boolean): Promise<void> => {
    const response = await fetch(`/api/feeds/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    return handleAPIResponse(response, 'Failed to toggle feed');
  }, []);

  /**
   * Triggers an immediate refresh of a feed's content
   * @param id - The ID of the feed to refresh
   * @returns Promise resolving when the refresh is complete
   */
  const refreshFeed = useCallback(async (id: number): Promise<void> => {
    const response = await fetch(`/api/feeds/${id}/refresh`, {
      method: 'POST',
    });
    return handleAPIResponse(response, 'Failed to refresh feed');
  }, []);

  /**
   * Imports feeds from an OPML file
   * @param file - The OPML file to import
   * @returns Promise resolving to the import results
   */
  const importOPML = useCallback(async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/feeds/import', {
      method: 'POST',
      body: formData,
    });
    return handleAPIResponse(response, 'Failed to import OPML file');
  }, []);

  // React Query mutations with cache invalidation
  const addFeedMutation = useMutation({
    mutationFn: addFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  const updateFeedMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Feed> }) =>
      updateFeed(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  const deleteFeedMutation = useMutation({
    mutationFn: deleteFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  const toggleFeedMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      toggleFeed(id, isActive),
    onMutate: async ({ id, isActive }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['feeds'] });

      // Snapshot the previous value
      const previousFeeds = queryClient.getQueryData<Feed[]>(['feeds']);

      // Optimistically update to the new value
      if (previousFeeds) {
        queryClient.setQueryData<Feed[]>(['feeds'], old => 
          old?.map(feed => feed.id === id ? { ...feed, isActive } : feed) ?? []
        );
      }

      // Return a context object with the snapshotted value
      return { previousFeeds };
    },
    onError: (err, variables, context?: MutationContext) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFeeds) {
        queryClient.setQueryData(['feeds'], context.previousFeeds);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  const refreshFeedMutation = useMutation({
    mutationFn: refreshFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  const importOPMLMutation = useMutation({
    mutationFn: importOPML,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });

  return {
    addFeed: addFeedMutation.mutateAsync,
    updateFeed: updateFeedMutation.mutateAsync,
    deleteFeed: deleteFeedMutation.mutateAsync,
    toggleFeed: toggleFeedMutation.mutateAsync,
    refreshFeed: refreshFeedMutation.mutateAsync,
    importOPML: importOPMLMutation.mutateAsync,
  };
}; 