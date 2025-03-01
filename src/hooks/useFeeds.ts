import { useQuery } from '@tanstack/react-query';
import { Feed } from '../types/feed-management';
import { fetchFromAPI } from '../utils/api-helpers';

/**
 * Hook to fetch and manage feeds
 * @returns Object containing feeds data, loading state, and error
 */
export function useFeeds() {
  const {
    data: feeds = [],
    isLoading,
    error,
  } = useQuery<Feed[], Error>({
    queryKey: ['feeds'],
    queryFn: () => fetchFromAPI<Feed[]>('/api/feeds'),
  });

  return {
    feeds,
    isLoading,
    error,
  };
} 