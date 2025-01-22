import { config } from '../config';
import axios, { AxiosError } from 'axios';
import { RateLimiter } from './rate-limiter';

export class FeedlyError extends Error {
  constructor(
    message: string, 
    public readonly cause?: unknown,
    public readonly isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'FeedlyError';
  }
}

// Feedly API response types
interface FeedlyStreamIds {
  ids: string[];
  continuation?: string;
}

export interface FeedlyEntry {
  id: string;
  title: string;
  content?: {
    content: string;
  };
  summary?: {
    content: string;
  };
  author?: string;
  published: number;
  origin?: {
    streamId?: string;
    title: string;
    htmlUrl: string;
  };
  alternate?: {
    href: string;
    type: string;
  }[];
  tags?: {
    id: string;
    label: string;
  }[];
  engagement?: number;
  engagementRate?: number;
  keywords?: string[];
  canonicalUrl?: string;
  visual?: {
    url: string;
    width: number;
    height: number;
    contentType: string;
  };
  language?: string;
  readTime?: number;
  fingerprint?: string;
  categories?: {
    id: string;
    label: string;
  }[];
}

interface FeedlyEntries {
  items: FeedlyEntry[];
}

interface FeedlyAuth {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

interface FeedlyConfig {
  auth: FeedlyAuth;
  baseUrl: string;
}

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

export class FeedlyService {
  private config: FeedlyConfig;
  private rateLimiter: RateLimiter;

  constructor() {
    if (!config.feedly?.auth) {
      throw new FeedlyError('Feedly authentication is not configured', undefined, false);
    }

    this.config = {
      auth: config.feedly.auth,
      baseUrl: 'https://cloud.feedly.com/v3',
    };

    // Initialize rate limiter with Feedly's limits
    // Default to 250 requests per 15 minutes
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 250,
      intervalMs: 15 * 60 * 1000, // 15 minutes
      maxTokens: 250
    });
  }

  /**
   * Get saved items for the authenticated user
   * @param count Number of items to retrieve (default: 20, max: 100)
   * @returns Array of saved items
   */
  async getSavedItems(count = 20): Promise<FeedlyEntry[]> {
    return this.withRetry(async () => {
      // Wait for rate limit token
      await this.rateLimiter.consume();

      try {
        const streamResponse = await axios.get<FeedlyEntries>(
          `${this.config.baseUrl}/streams/contents`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.auth.accessToken}`,
            },
            params: {
              streamId: `user/${this.config.auth.userId}/tag/global.saved`,
              count: Math.min(count, 100),
              ranked: 'newest',
              similar: true,
            },
          }
        );

        return streamResponse.data.items || [];

      } catch (error) {
        throw this.handleApiError(error);
      }
    });
  }

  /**
   * Refresh the access token using the refresh token
   * @returns New access token
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      const response = await axios.post<{ access_token: string }>(
        `${this.config.baseUrl}/auth/token`,
        {
          refresh_token: this.config.auth.refreshToken,
          client_id: config.feedly?.clientId,
          client_secret: config.feedly?.clientSecret,
          grant_type: 'refresh_token',
        }
      );

      // Update the stored access token
      this.config.auth.accessToken = response.data.access_token;
      
      return response.data.access_token;
    } catch (error) {
      throw new FeedlyError(
        'Failed to refresh access token', 
        error, 
        false // Not retryable - if refresh fails, we need user intervention
      );
    }
  }

  /**
   * Handles API errors and converts them to FeedlyError instances
   */
  private handleApiError(error: unknown): FeedlyError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.errorMessage || error.message;
      
      // Handle specific HTTP status codes
      switch (status) {
        case 401:
          return new FeedlyError(
            'Authentication failed', 
            error,
            true // Retryable after token refresh
          );
        case 429:
          return new FeedlyError(
            'Rate limit exceeded',
            error,
            true // Retryable after delay
          );
        case 503:
        case 504:
          return new FeedlyError(
            'Service temporarily unavailable',
            error,
            true // Retryable
          );
        case 400:
        case 403:
        case 404:
          return new FeedlyError(
            `API request failed: ${errorMessage}`,
            error,
            false // Not retryable - client error
          );
        default:
          return new FeedlyError(
            'Unexpected API error',
            error,
            status ? status >= 500 : true // Retry on 5xx or unknown errors
          );
      }
    }

    return new FeedlyError('Unknown error occurred', error);
  }

  /**
   * Executes an operation with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    options = DEFAULT_RETRY_OPTIONS
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = options.initialDelayMs;

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // If error is not retryable, throw immediately
        if (error instanceof FeedlyError && !error.isRetryable) {
          throw error;
        }

        // On auth error, try to refresh token once
        if (error instanceof FeedlyError && 
            axios.isAxiosError(error.cause) && 
            error.cause.response?.status === 401) {
          try {
            await this.refreshAccessToken();
            continue; // Retry immediately with new token
          } catch (refreshError) {
            throw refreshError; // If refresh fails, stop retrying
          }
        }

        // If this was our last attempt, throw the error
        if (attempt === options.maxRetries) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff with jitter
        delay = Math.min(
          delay * 2 * (0.5 + Math.random()), 
          options.maxDelayMs
        );
      }
    }

    // This should never happen due to the for loop condition
    throw lastError || new Error('Retry loop completed without success');
  }
} 