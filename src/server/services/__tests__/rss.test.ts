import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RSSService, RSSError } from '../rss';
import { Pool, PoolClient } from 'pg';
import Parser from 'rss-parser';

// Mock the database pool
vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn(),
    connect: vi.fn().mockImplementation(() => Promise.resolve({
      query: vi.fn(),
      release: vi.fn(),
    }))
  }))
}));

// Mock rss-parser
vi.mock('rss-parser', () => ({
  default: vi.fn().mockImplementation(() => ({
    parseURL: vi.fn()
  }))
}));

describe('RSSService', () => {
  let service: RSSService;
  let mockPool: {
    connect: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
  let mockParserInstance: any;

  const mockFeedData = {
    title: 'Test Feed',
    description: 'A test feed',
    link: 'https://example.com',
    image: { url: 'https://example.com/icon.png' }
  };

  const mockFeed = {
    id: 1,
    userId: 1,
    feedUrl: 'https://example.com/feed.xml',
    title: 'Test Feed',
    description: 'A test feed',
    siteUrl: 'https://example.com',
    iconUrl: 'https://example.com/icon.png',
    lastFetchedAt: undefined,
    errorCount: 0,
    isActive: true,
    fetchIntervalMinutes: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
    image: { url: 'https://example.com/icon.png' }
  };

  const mockFeedContent = {
    items: [{
      guid: 'item1',
      title: 'Test Item',
      content: 'Test content',
      link: 'https://example.com/item1'
    }]
  };

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Mock feed content
    mockParserInstance = {
      parseString: vi.fn().mockResolvedValue({ 
        items: [{
          guid: 'item1',
          title: 'Test Item',
          content: 'Test content',
          link: 'https://example.com/item1',
          isoDate: new Date().toISOString()
        }]
      }),
      parseURL: vi.fn().mockResolvedValue(mockFeedData),
      options: {},
      defaultRSS: vi.fn(),
      getDefaults: vi.fn()
    };

    // Mock Parser class
    vi.mocked(Parser).mockImplementation(() => mockParserInstance);

    // Mock database client
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };

    // Mock database pool
    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn()
    };

    service = new RSSService(mockPool as unknown as Pool);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addFeed', () => {
    it('should add a new feed successfully', async () => {
      // Mock the feed validation
      mockParserInstance.parseURL.mockResolvedValueOnce(mockFeedData);

      // Mock the database queries
      mockClient.query.mockImplementation((query: string, params?: any[]) => {
        if (query === 'BEGIN') {
          return Promise.resolve({ rows: [] });
        }
        if (query === 'COMMIT') {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id FROM users')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('INSERT INTO feed_configs')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              userId: 1,
              feedUrl: 'https://example.com/feed.xml',
              title: mockFeedData.title,
              description: mockFeedData.description,
              siteUrl: mockFeedData.link,
              iconUrl: mockFeedData.image?.url,
              errorCount: 0,
              isActive: true,
              fetchIntervalMinutes: 60,
              lastFetchedAt: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.addFeed(1, 'https://example.com/feed.xml');

      expect(result).toMatchObject({
        title: mockFeedData.title,
        description: mockFeedData.description,
        siteUrl: mockFeedData.link,
        iconUrl: mockFeedData.image.url
      });

      // Verify transaction was started and committed
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verify user check
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM users'),
        expect.arrayContaining([1])
      );

      // Verify feed insertion
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feed_configs'),
        expect.arrayContaining([1, 'https://example.com/feed.xml'])
      );
    });

    it('should throw error for invalid feed URL', async () => {
      // Mock the database queries
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') {
          return Promise.resolve({ rows: [] });
        }
        if (query === 'ROLLBACK') {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id FROM users')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockParserInstance.parseURL.mockRejectedValueOnce(new Error('Invalid URL'));

      await expect(
        service.addFeed(1, 'invalid-url')
      ).rejects.toThrow(RSSError);

      // Verify transaction was rolled back
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if user does not exist', async () => {
      // Mock the user existence check to return no rows
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') {
          return Promise.resolve();
        }
        if (query === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (query.includes('SELECT id FROM users')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.addFeed(1, 'https://example.com/feed.xml')
      ).rejects.toThrow(RSSError);

      // Verify we didn't try to validate the feed
      expect(mockParserInstance.parseURL).not.toHaveBeenCalled();
    });
  });

  describe('pollFeed', () => {
    it('should poll feed and add new items', async () => {
      // Mock feed fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('<rss><channel><item><guid>item1</guid><title>Test Item</title><content>Test content</content><link>https://example.com/item1</link></item></channel></rss>'),
        headers: new Headers({
          'content-type': 'application/xml'
        })
      });

      // Mock database queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT id FROM feed_items
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT INTO feed_items
        .mockResolvedValueOnce({ rows: [] }) // INSERT INTO item_states
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await service.pollFeed(mockFeed);

      // Verify transaction was started and committed
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT');

      // Verify existing items check
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        `SELECT id FROM feed_items 
             WHERE source_type = 'rss'
             AND source_id = $1`,
        ['item1']
      );

      // Verify item insertion
      expect(mockClient.query).toHaveBeenNthCalledWith(3,
        `INSERT INTO feed_items (
              source_id, source_type, title, author, content,
              summary, url, published_at, raw_metadata, feed_config_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
        ['item1', 'rss', 'Test Item', undefined, 'Test content', '', 'https://example.com/item1', expect.any(Date), JSON.stringify({categories: [], enclosures: []}), mockFeed.id]
      );

      // Verify item state creation
      expect(mockClient.query).toHaveBeenNthCalledWith(4,
        `INSERT INTO item_states (user_id, feed_item_id, is_read, is_saved)
             VALUES ($1, $2, false, false)
             ON CONFLICT (user_id, feed_item_id) DO NOTHING`,
        [mockFeed.userId, 1]
      );
    });

    it('should handle missing feed URL', async () => {
      const invalidFeed = { ...mockFeed, feedUrl: '' };

      await expect(
        service.pollFeed(invalidFeed)
      ).rejects.toThrow('Feed URL is missing');
    });

    it('should handle feed fetch errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(
        service.pollFeed(mockFeed)
      ).rejects.toThrow('Feed returned status 404: Not Found');
    });

    it('should handle feed parse errors', async () => {
      // Mock fetch to return invalid content
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('invalid content'),
        headers: {
          get: () => 'application/xml'
        }
      });

      // Mock parser to throw error
      mockParserInstance.parseString.mockRejectedValueOnce(new Error('Parse error'));

      const testFeed = {
        id: 1,
        userId: 1,
        feedUrl: 'http://example.com/feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        siteUrl: 'http://example.com',
        iconUrl: undefined,
        lastFetchedAt: undefined,
        errorCount: 0,
        isActive: true,
        fetchIntervalMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(service.pollFeed(testFeed)).rejects.toThrow('Failed to poll feed: Parse error');
    });
  });

  describe('pollFeeds', () => {
    it('should poll only active and due feeds', async () => {
      // Mock active feeds query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            userId: 1,
            feedUrl: 'http://example.com/feed1.xml',
            title: 'Test Feed 1',
            description: 'A test feed',
            siteUrl: 'http://example.com',
            iconUrl: undefined,
            lastFetchedAt: undefined,
            errorCount: 0,
            isActive: true,
            fetchIntervalMinutes: 60,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 2,
            userId: 1,
            feedUrl: 'http://example.com/feed2.xml',
            title: 'Test Feed 2',
            description: 'Another test feed',
            siteUrl: 'http://example.com',
            iconUrl: undefined,
            lastFetchedAt: undefined,
            errorCount: 0,
            isActive: true,
            fetchIntervalMinutes: 60,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });

      // Mock client queries
      mockClient.query.mockImplementation((sql: string) => {
        if (sql === 'BEGIN') {
          return Promise.resolve({ rows: [] });
        }
        if (sql === 'COMMIT') {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT id FROM feed_items')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO feed_items')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (sql.includes('INSERT INTO item_states')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('UPDATE feed_configs')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Mock fetch to return RSS content
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<rss><channel><title>Test Feed</title><item><guid>item1</guid><title>Test Item</title><content>Test content</content><link>https://example.com/item1</link></item></channel></rss>'),
        headers: {
          get: () => 'application/xml'
        }
      });

      await service.pollFeeds();

      // Verify parse was called for each feed
      expect(mockParserInstance.parseString).toHaveBeenCalledTimes(2);
      expect(mockParserInstance.parseString).toHaveBeenCalledWith(expect.stringContaining('<rss>'));

      // Verify items were processed
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO feed_items'), 
        expect.arrayContaining(['item1', 'rss', 'Test Item']));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
}); 