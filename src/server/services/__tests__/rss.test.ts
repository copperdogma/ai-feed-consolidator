import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RSSService, RSSError } from '../rss';
import { Pool } from 'pg';
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
  let mockPool: any;
  let mockParser: any;
  let mockClient: any;

  const mockFeedData = {
    title: 'Test Feed',
    description: 'A test feed',
    link: 'https://example.com',
    image: { url: 'https://example.com/icon.png' }
  };

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockImplementation((query, values) => {
        // Mock BEGIN transaction
        if (query === 'BEGIN') {
          return Promise.resolve();
        }
        // Mock COMMIT transaction
        if (query === 'COMMIT') {
          return Promise.resolve();
        }
        // Mock ROLLBACK transaction
        if (query === 'ROLLBACK') {
          return Promise.resolve();
        }
        // Mock user existence check
        if (query.includes('SELECT id FROM users')) {
          return Promise.resolve({ rows: [{ id: values[0] }] });
        }
        // Mock feed insert
        if (query.includes('INSERT INTO feed_configs')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              userId: values[0],
              feedUrl: values[1],
              title: mockFeedData.title,
              description: mockFeedData.description,
              siteUrl: mockFeedData.link,
              iconUrl: mockFeedData.image?.url,
              errorCount: 0,
              isActive: true,
              fetchIntervalMinutes: 60
            }]
          });
        }
        // Default empty result
        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn()
    };
    mockPool = new Pool();
    mockPool.connect.mockResolvedValue(mockClient);
    service = new RSSService(mockPool);
    mockParser = (service as any).parser;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addFeed', () => {
    it('should add a new feed successfully', async () => {
      // Mock the feed validation
      mockParser.parseURL.mockResolvedValueOnce(mockFeedData);

      // Mock the user existence check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Mock the database insert
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          userId: 1,
          feedUrl: 'https://example.com/feed.xml',
          title: mockFeedData.title,
          description: mockFeedData.description,
          siteUrl: mockFeedData.link,
          iconUrl: mockFeedData.image.url,
          errorCount: 0,
          isActive: true,
          fetchIntervalMinutes: 60
        }]
      });

      const result = await service.addFeed(1, 'https://example.com/feed.xml');

      expect(result).toMatchObject({
        title: mockFeedData.title,
        description: mockFeedData.description,
        siteUrl: mockFeedData.link,
        iconUrl: mockFeedData.image.url
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM users'),
        expect.arrayContaining([1])
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feed_configs'),
        expect.arrayContaining([1, 'https://example.com/feed.xml'])
      );
    });

    it('should throw error for invalid feed URL', async () => {
      mockParser.parseURL.mockRejectedValueOnce(new Error('Invalid URL'));

      await expect(
        service.addFeed(1, 'invalid-url')
      ).rejects.toThrow(RSSError);
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
      expect(mockParser.parseURL).not.toHaveBeenCalled();
    });
  });

  describe('pollFeed', () => {
    const mockFeed = {
      id: 1,
      userId: 1,
      feedUrl: 'https://example.com/feed.xml',
      title: 'Test Feed',
      errorCount: 0,
      isActive: true,
      fetchIntervalMinutes: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockFeedContent = {
      title: 'Updated Feed',
      items: [
        {
          title: 'Test Item',
          guid: 'item1',
          link: 'https://example.com/item1',
          content: 'Test content',
          creator: 'Test Author',
          isoDate: '2024-01-25T00:00:00.000Z'
        }
      ]
    };

    it('should poll feed and add new items', async () => {
      // Mock the feed fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('mock content'),
        headers: { get: () => 'application/xml' }
      });

      // Mock the feed parsing
      mockParser.parseURL.mockResolvedValueOnce(mockFeedContent);

      // Mock database queries
      mockClient.query
        // Mock BEGIN transaction
        .mockResolvedValueOnce({ rows: [] })
        // Check for existing item
        .mockResolvedValueOnce({ rows: [] })
        // Insert new item
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        // Insert item state
        .mockResolvedValueOnce({ rows: [] })
        // Mock COMMIT transaction
        .mockResolvedValueOnce({ rows: [] });

      await service.pollFeed(mockFeed);

      // Verify feed was fetched
      expect(global.fetch).toHaveBeenCalledWith(mockFeed.feedUrl);

      // Verify item was inserted
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feed_items'),
        expect.arrayContaining([
          'item1',
          'rss',
          'Test Item',
          'Test Author',
          'Test content',
          expect.any(String),
          'https://example.com/item1',
          expect.any(Date),
          expect.any(String),
          1
        ])
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
        status: 404
      });

      await expect(
        service.pollFeed(mockFeed)
      ).rejects.toThrow('Feed returned status 404');
    });

    it('should handle feed parse errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('mock content'),
        headers: { get: () => 'application/xml' }
      });

      mockParser.parseURL.mockRejectedValueOnce(new Error('Parse error'));

      await expect(
        service.pollFeed(mockFeed)
      ).rejects.toThrow('Failed to poll feed: Parse error');
    });
  });
}); 