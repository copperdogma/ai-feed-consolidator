import { logger } from '../../logger';
import { ErrorCategory, ValidationResult } from '../../../types/feed-health';

export class RSSFetchError extends Error {
  public readonly originalError: Error | null;
  public readonly isTransient: boolean;
  public readonly errorCategory: ErrorCategory;
  public readonly isPermanentlyInvalid: boolean;

  constructor(options: {
    message: string;
    originalError?: Error | null;
    isTransient?: boolean;
    errorCategory: ErrorCategory;
    isPermanentlyInvalid?: boolean;
  }) {
    super(options.message);
    this.originalError = options.originalError || null;
    this.isTransient = options.isTransient || false;
    this.errorCategory = options.errorCategory;
    this.isPermanentlyInvalid = options.isPermanentlyInvalid || false;
    this.name = 'RSSFetchError';
  }
}

const FEED_FETCH_TIMEOUT = 30000; // 30 seconds
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; RSSFeedReader/1.0; +https://example.com/bot)'
};

export interface FetchResult {
  content: string;
  statusCode: number;
  headers: Record<string, string>;
}

export class RSSFetcher {
  private readonly userAgent: string;
  private readonly fallbackUserAgent: string;
  private readonly timeout: number;

  constructor(options: { userAgent?: string; fallbackUserAgent?: string; timeoutMs?: number } = {}) {
    this.userAgent = options.userAgent || 'AI Feed Consolidator/1.0';
    this.fallbackUserAgent = options.fallbackUserAgent || 'Mozilla/5.0 (compatible; RSSFeedReader/1.0; +https://example.com/bot)';
    this.timeout = options.timeoutMs || 15000;
  }

  /**
   * Fetch RSS feed content from a URL
   */
  async fetchFeed(url: string): Promise<FetchResult> {
    if (!url) {
      throw new RSSFetchError({
        message: 'Feed URL is required',
        isTransient: false,
        errorCategory: 'VALIDATION_ERROR',
        isPermanentlyInvalid: true
      });
    }

    // Try with primary user agent first
    try {
      return await this.fetchWithUserAgent(url, this.userAgent);
    } catch (error) {
      // If we get a 403, try with fallback user agent
      if (error instanceof RSSFetchError && error.errorCategory === 'AUTH_ERROR') {
        try {
          return await this.fetchWithUserAgent(url, this.fallbackUserAgent);
        } catch (fallbackError) {
          // If fallback also fails, throw the original error
          throw error;
        }
      }
      throw error;
    }
  }

  private async fetchWithUserAgent(url: string, userAgent: string): Promise<FetchResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        let errorCategory: ErrorCategory;
        let isPermanentlyInvalid = false;
        let isTransient = false;

        // Categorize HTTP status codes
        if (status === 408 || status === 504) {
          errorCategory = 'TIMEOUT';
          isTransient = true;
        } else if (status >= 500) {
          errorCategory = 'NETWORK_ERROR';
          isTransient = true;
        } else if (status === 404) {
          errorCategory = 'HTTP_STATUS';
          isPermanentlyInvalid = true;
        } else if (status === 403 || status === 401) {
          errorCategory = 'AUTH_ERROR';
          isPermanentlyInvalid = false; // Changed to false since we might retry with fallback
        } else {
          errorCategory = 'HTTP_STATUS';
          isTransient = status >= 500;
          isPermanentlyInvalid = status < 500;
        }

        throw new RSSFetchError({
          message: `HTTP ${status}: ${response.statusText}`,
          isTransient,
          errorCategory,
          isPermanentlyInvalid
        });
      }

      const content = await response.text();
      if (!content.trim()) {
        throw new RSSFetchError({
          message: 'Empty response received',
          isTransient: false,
          errorCategory: 'EMPTY_RESPONSE',
          isPermanentlyInvalid: true
        });
      }

      const headers = Object.fromEntries(response.headers.entries());

      return {
        content,
        statusCode: response.status,
        headers
      };
    } catch (error: unknown) {
      // Handle abort/timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RSSFetchError({
          message: 'Request timed out',
          originalError: error,
          isTransient: true,
          errorCategory: 'TIMEOUT',
          isPermanentlyInvalid: false
        });
      }

      // If it's already an RSSFetchError, just rethrow it
      if (error instanceof RSSFetchError) {
        throw error;
      }

      // Handle other errors
      throw new RSSFetchError({
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        originalError: error instanceof Error ? error : null,
        isTransient: true,
        errorCategory: 'UNKNOWN_ERROR',
        isPermanentlyInvalid: false
      });
    }
  }

  /**
   * Validate a feed URL by attempting to fetch it
   */
  async validateFeed(url: string): Promise<ValidationResult> {
    try {
      const result = await this.fetchFeed(url);
      
      return {
        url,
        isValid: true,
        statusCode: result.statusCode,
        contentType: result.headers['content-type']
      };
    } catch (error) {
      if (error instanceof RSSFetchError) {
        return {
          url,
          isValid: false,
          errorCategory: error.errorCategory,
          errorDetail: error.message,
          statusCode: this.getStatusCodeForError(error),
          isPermanentlyInvalid: error.isPermanentlyInvalid
        };
      }

      const categorizedError = this.categorizeFetchError(error);
      return {
        url,
        isValid: false,
        errorCategory: categorizedError.errorCategory,
        errorDetail: categorizedError.message,
        statusCode: this.getStatusCodeForError(categorizedError),
        isPermanentlyInvalid: categorizedError.isPermanentlyInvalid
      };
    }
  }

  private getStatusCodeForError(error: RSSFetchError): number {
    switch (error.errorCategory) {
      case 'TIMEOUT':
        return 408;
      case 'DNS_ERROR':
        return 523;
      case 'SSL_ERROR':
        return 525;
      case 'PARSE_ERROR':
        return 422;
      case 'NETWORK_ERROR':
        return 503;
      default:
        return 500;
    }
  }

  private categorizeFetchError(error: unknown): RSSFetchError {
    if (error instanceof RSSFetchError) {
      return error;
    }

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const errorCode = (error as NodeJS.ErrnoException).code;
      
      // Handle timeout errors
      if (
        error.name === 'AbortError' || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('abort') ||
        errorCode === 'ETIMEDOUT' ||
        errorMessage.includes('timed out')
      ) {
        return new RSSFetchError({
          message: 'Request timed out while fetching feed',
          originalError: error,
          isTransient: true,
          errorCategory: 'TIMEOUT',
          isPermanentlyInvalid: false
        });
      }
      
      // Handle DNS errors
      if (
        errorMessage.includes('dns') || 
        errorMessage.includes('getaddrinfo') ||
        errorCode === 'ENOTFOUND' ||
        errorMessage.includes('enotfound')
      ) {
        return new RSSFetchError({
          message: 'DNS resolution error while fetching feed',
          originalError: error,
          isTransient: false,
          errorCategory: 'DNS_ERROR',
          isPermanentlyInvalid: true
        });
      }
      
      // Handle SSL errors
      if (
        errorMessage.includes('ssl') || 
        errorMessage.includes('certificate') ||
        errorCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        errorMessage.includes('unable to verify')
      ) {
        return new RSSFetchError({
          message: 'SSL certificate error while fetching feed',
          originalError: error,
          isTransient: true,
          errorCategory: 'SSL_ERROR',
          isPermanentlyInvalid: false
        });
      }
      
      // Handle network errors
      if (
        errorMessage.includes('network') || 
        errorMessage.includes('fetch') ||
        errorCode === 'ECONNRESET' ||
        errorCode === 'ECONNREFUSED' ||
        errorMessage.includes('failed to fetch')
      ) {
        return new RSSFetchError({
          message: 'Network error while fetching feed',
          originalError: error,
          isTransient: true,
          errorCategory: 'NETWORK_ERROR',
          isPermanentlyInvalid: false
        });
      }

      // Handle parse errors
      if (
        errorMessage.includes('parse') ||
        errorMessage.includes('invalid xml') ||
        errorMessage.includes('syntax error')
      ) {
        return new RSSFetchError({
          message: 'Failed to parse feed content',
          originalError: error,
          isTransient: false,
          errorCategory: 'PARSE_ERROR',
          isPermanentlyInvalid: false
        });
      }
    }
    
    // Default error handling
    return new RSSFetchError({
      message: 'Unknown error while fetching feed',
      originalError: error instanceof Error ? error : null,
      isTransient: true,
      errorCategory: 'UNKNOWN_ERROR',
      isPermanentlyInvalid: false
    });
  }
} 