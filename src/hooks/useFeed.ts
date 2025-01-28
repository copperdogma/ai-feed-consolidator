import { useQuery } from '@tanstack/react-query';
import { ProcessedFeedItem } from '../types/feed';
import config from '../config';

interface APIError {
  message: string;
  details?: string;
  status?: number;
  code?: string;
  retryable?: boolean;
}

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY = 30000; // 30 seconds

function isRetryableError(error: APIError): boolean {
  // Don't retry client errors (4xx) except for 429 (rate limit)
  if (error.status && error.status >= 400 && error.status < 500) {
    return error.status === 429;
  }
  
  // Don't retry if explicitly marked as non-retryable
  if (error.retryable === false) {
    return false;
  }

  // Retry server errors (5xx) and network errors
  return true;
}

function getRetryDelay(attemptIndex: number, error: APIError): number {
  // For rate limit errors (429), use the Retry-After header if available
  if (error.status === 429 && error.details) {
    const retryAfter = parseInt(error.details, 10);
    if (!isNaN(retryAfter)) {
      return Math.min(retryAfter * 1000, MAX_RETRY_DELAY);
    }
  }

  // Otherwise use exponential backoff with jitter
  const baseDelay = Math.min(1000 * 2 ** attemptIndex, MAX_RETRY_DELAY);
  const jitter = Math.random() * 100; // Add up to 100ms of jitter
  return baseDelay + jitter;
}

async function fetchFeedItems(): Promise<ProcessedFeedItem[]> {
  try {
    const response = await fetch(`${config.serverUrl}/api/feed/items`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: APIError = {
        message: errorData.message || 'Failed to fetch feed items',
        details: errorData.details || response.headers.get('Retry-After'),
        status: response.status,
        code: errorData.code,
        retryable: errorData.retryable,
      };
      
      // Add more context based on status code
      if (response.status === 401) {
        error.message = 'Please log in to view feed items';
        error.retryable = false;
      } else if (response.status === 403) {
        error.message = 'You do not have permission to view these feed items';
        error.retryable = false;
      } else if (response.status === 404) {
        error.message = 'Feed items not found';
        error.retryable = false;
      } else if (response.status === 429) {
        error.message = 'Rate limit exceeded. Please try again later.';
        error.retryable = true;
      } else if (response.status >= 500) {
        error.message = 'Server error while fetching feed items';
        error.retryable = true;
      }

      throw error;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const networkError: APIError = {
        message: 'Unable to connect to the server. Please check your internet connection.',
        retryable: true,
      };
      throw networkError;
    }
    
    // Re-throw API errors
    if ((error as APIError).status) {
      throw error;
    }
    
    // Handle unexpected errors
    const unexpectedError: APIError = {
      message: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error),
      retryable: true,
    };
    throw unexpectedError;
  }
}

export function useFeedItems() {
  return useQuery({
    queryKey: ['feedItems'],
    queryFn: fetchFeedItems,
    retry: (failureCount, error: APIError) => {
      if (!isRetryableError(error)) {
        return false;
      }
      return failureCount < MAX_RETRIES;
    },
    retryDelay: (attemptIndex, error: APIError) => getRetryDelay(attemptIndex, error),
  });
} 