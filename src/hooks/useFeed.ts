import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ProcessedFeedItem } from '../types/feed';
import { transformFeedItems } from '../lib/transformFeed';

const FEED_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const FEED_GC_TIME = 1000 * 60 * 30; // 30 minutes

export const useFeedItems = (feedId?: number): UseQueryResult<ProcessedFeedItem[], Error> => {
  return useQuery({
    queryKey: ['feedItems', feedId],
    queryFn: async () => {
      try {
        // If no feedId is provided, fetch all items
        const endpoint = feedId ? `/api/feeds/${feedId}/items` : '/api/feeds/items';
        const res = await fetch(endpoint);
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return transformFeedItems(data || []);
      } catch (error) {
        console.error('Failed to fetch feed items:', error);
        throw error;
      }
    },
    staleTime: FEED_STALE_TIME,
    gcTime: FEED_GC_TIME,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}; 