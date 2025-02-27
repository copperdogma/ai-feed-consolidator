import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedFeedValidator } from '../utils/enhanced-feed-validator';
import { HttpClient, HttpError, ErrorCategory } from '../utils/http-client';
import { HttpResponse, Headers } from '../types/http-types';

// Mock the HttpClient module
const mockGetStatic = vi.fn();
const mockGet = vi.fn();

vi.mock('../utils/http-client', () => {
  return {
    __esModule: true,
    ErrorCategory: {
      DNS_ERROR: 'DNS_ERROR',
      SSL_ERROR: 'SSL_ERROR',
      HTTP_STATUS: 'HTTP_STATUS',
      TIMEOUT: 'TIMEOUT',
      NETWORK_ERROR: 'NETWORK_ERROR',
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      EMPTY_RESPONSE: 'EMPTY_RESPONSE',
      EMPTY_FEED: 'EMPTY_FEED'
    },
    HttpClient: class MockHttpClient {
      static DEFAULT_USER_AGENT = 'Test User Agent';
      static FALLBACK_USER_AGENT = 'Test Fallback Agent';
      
      // Add instance methods
      async get() {
        return mockGet();
      }
      
      // Add static methods
      static async getStatic() {
        return mockGetStatic();
      }
    },
    HttpError: class MockHttpError extends Error {
      category: ErrorCategory;
      status?: number;
      
      constructor(message: string, category: ErrorCategory, status?: number) {
        super(message);
        this.name = 'HttpError';
        this.category = category;
        this.status = status;
      }
    }
  };
});

describe('EnhancedFeedValidator', () => {
  let validator: EnhancedFeedValidator;

  function createHeaders(entries: [string, string][]): Headers {
    const map = new Map(entries);
    return {
      get: (name: string) => map.get(name) || null,
      ...Object.fromEntries(map.entries())
    };
  }

  function createHttpError(message: string, category: ErrorCategory, status?: number): HttpError {
    return new HttpError(message, category, status);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatic.mockReset();
    mockGet.mockReset();
    validator = new EnhancedFeedValidator();
  });

  it('should validate a valid feed', async () => {
    const mockResponse: HttpResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: createHeaders([['content-type', 'application/xml']]),
      text: () => Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <description>Test Description</description>
            <link>http://example.com</link>
            <item>
              <title>Test Item</title>
              <description>Test Item Description</description>
              <link>http://example.com/item</link>
              <guid>http://example.com/item</guid>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`)
    };

    mockGetStatic.mockResolvedValue(mockResponse);

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: true,
      statusCode: 200,
      feedInfo: expect.any(Object)
    });
  });

  it('should handle 404 errors', async () => {
    mockGetStatic.mockRejectedValue(
      createHttpError('Not Found', 'HTTP_STATUS', 404)
    );

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: false,
      errorCategory: 'HTTP_STATUS',
      errorDetail: 'Not Found',
      statusCode: 404
    });
  });

  it('should handle SSL errors', async () => {
    mockGetStatic.mockRejectedValue(
      createHttpError('SSL Error', 'SSL_ERROR')
    );

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: false,
      errorCategory: 'SSL_ERROR',
      errorDetail: 'SSL Error'
    });
  });

  it('should handle DNS errors', async () => {
    mockGetStatic.mockRejectedValue(
      createHttpError('DNS Error', 'DNS_ERROR')
    );

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: false,
      errorCategory: 'DNS_ERROR',
      errorDetail: 'DNS Error'
    });
  });

  it('should handle timeouts', async () => {
    mockGetStatic.mockRejectedValue(
      createHttpError('Request timed out', 'TIMEOUT')
    );

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: false,
      errorCategory: 'TIMEOUT',
      errorDetail: 'Request timed out'
    });
  });

  it('should handle invalid XML', async () => {
    const mockResponse: HttpResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: createHeaders([['content-type', 'application/xml']]),
      text: () => Promise.resolve('invalid xml')
    };

    mockGetStatic.mockResolvedValue(mockResponse);

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: false,
      errorCategory: 'VALIDATION_ERROR',
      errorDetail: 'Invalid XML structure'
    });
  });

  it('should handle empty responses', async () => {
    const mockResponse: HttpResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: createHeaders([['content-type', 'application/xml']]),
      text: () => Promise.resolve('')
    };

    mockGetStatic.mockResolvedValue(mockResponse);

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: false,
      errorCategory: 'EMPTY_RESPONSE',
      errorDetail: 'Empty response'
    });
  });

  it('should handle empty feeds (valid XML but no items)', async () => {
    const mockResponse: HttpResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: createHeaders([['content-type', 'application/xml']]),
      text: () => Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Empty Feed</title>
            <description>Empty Feed Description</description>
            <link>http://example.com</link>
          </channel>
        </rss>`)
    };

    mockGetStatic.mockResolvedValue(mockResponse);

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: false,
      errorCategory: 'EMPTY_FEED',
      errorDetail: 'Feed contains no items',
      feedInfo: expect.any(Object)
    });
  });

  it('should validate multiple feeds', async () => {
    const mockResponse: HttpResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: createHeaders([['content-type', 'application/xml']]),
      text: () => Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <description>Test Description</description>
            <link>http://example.com</link>
            <item>
              <title>Test Item 1</title>
              <description>Test Item Description 1</description>
              <link>http://example.com/item1</link>
              <guid>http://example.com/item1</guid>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
            <item>
              <title>Test Item 2</title>
              <description>Test Item Description 2</description>
              <link>http://example.com/item2</link>
              <guid>http://example.com/item2</guid>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`)
    };

    mockGetStatic.mockResolvedValue(mockResponse);

    const result = await validator.validateFeed('http://example.com/feed.xml');
    expect(result).toEqual({
      url: 'http://example.com/feed.xml',
      isValid: true,
      statusCode: 200,
      feedInfo: expect.any(Object)
    });
  });
}); 
