import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateFeed } from '../simplified-feed-validator';
import fetch from 'node-fetch';
import { logger } from '../../logger';
import '../../../tests/utils/test-hooks';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

describe('Feed Validation (Isolated)', () => {
  beforeEach(() => {
    try {
      vi.useFakeTimers();
      vi.clearAllMocks();
    } catch (error) {
      logger.error('Error in beforeEach:', error);
      throw error;
    }
  });

  afterEach(() => {
    try {
      vi.clearAllTimers();
      vi.useRealTimers();
    } catch (error) {
      logger.error('Error in afterEach:', error);
      throw error;
    }
  });

  it('should validate a valid RSS feed', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(`
        <?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <link>http://example.com</link>
            <description>Test Description</description>
            <item>
              <title>Test Item</title>
              <link>http://example.com/item</link>
              <description>Test Item Description</description>
            </item>
          </channel>
        </rss>
      `)
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await validateFeed('https://example.com/feed');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('should handle invalid URL format', async () => {
    const result = await validateFeed('not-a-url');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid URL format');
  });

  it('should handle network timeout', async () => {
    vi.mocked(fetch).mockImplementation(() => {
      throw new Error('AbortError');
    });
    
    const result = await validateFeed('https://example.com/timeout');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Network error: Connection failed');
  });

  it('should handle DNS lookup failure', async () => {
    vi.mocked(fetch).mockImplementation(() => {
      throw new Error('getaddrinfo ENOTFOUND nonexistent.example.com');
    });
    
    const result = await validateFeed('https://nonexistent.example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('DNS lookup failed');
  });

  it('should handle HTTP errors', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);
    
    const result = await validateFeed('https://example.com/not-found');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('HTTP error: 404 Not Found');
  });

  it('should handle empty response', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve('')
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);
    
    const result = await validateFeed('https://example.com/empty');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Empty response');
  });

  it('should handle invalid XML', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve('This is not XML at all < > & " \' invalid')
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);
    
    const result = await validateFeed('https://example.com/invalid-xml');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid XML format');
  });

  it('should handle missing required RSS elements', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(`
        <?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <!-- Missing link and description -->
          </channel>
        </rss>
      `)
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);
    
    const result = await validateFeed('https://example.com/invalid-rss');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid RSS format: missing required channel elements');
  });

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockImplementation(() => {
      throw new Error('Network error');
    });
    
    const result = await validateFeed('https://example.com/network-error');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Network error: Connection failed');
  });

  it('should handle SSL errors', async () => {
    vi.mocked(fetch).mockImplementation(() => {
      throw new Error('unable to verify the first certificate');
    });
    
    const result = await validateFeed('https://example.com/ssl-error');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Network error: unable to verify the first certificate');
  });

  it('should handle empty feed with valid XML', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(`
        <?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0">
          <channel>
            <title>Empty Feed</title>
            <link>http://example.com</link>
            <description>Empty feed</description>
          </channel>
        </rss>
      `)
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);
    
    const result = await validateFeed('https://example.com/empty-feed');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });
}); 