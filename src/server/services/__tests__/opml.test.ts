import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OPMLService } from '../opml';
import { RSSService } from '../rss/rss-service';
import { Pool } from 'pg';
import { RSSFeedConfig } from '../../../types/rss';
import { createMockServiceContainer } from '../../../tests/utils/mock-service-container';
import { ServiceContainer } from '../service-container';

type AddFeedFn = (userId: number, feedUrl: string) => Promise<RSSFeedConfig>;

describe('OPMLService', () => {
  let service: OPMLService;
  let mockPool: Pool;
  let mockServiceContainer: ReturnType<typeof createMockServiceContainer>;
  let mockAddFeed: ReturnType<typeof vi.fn<AddFeedFn>>;

  beforeEach(() => {
    // Create mock pool
    mockPool = {
      query: vi.fn(),
      connect: vi.fn()
    } as unknown as Pool;

    // Create mock RSS service with typed mock functions
    mockAddFeed = vi.fn<AddFeedFn>();
    const mockRssService = {
      addFeed: mockAddFeed,
      getFeed: vi.fn(),
      getUserFeeds: vi.fn(),
      deleteFeed: vi.fn(),
      getFeedHealth: vi.fn(),
      updateFeeds: vi.fn()
    } as unknown as RSSService;

    // Initialize service container
    mockServiceContainer = createMockServiceContainer(mockPool);
    mockServiceContainer.registerService('rssService', mockRssService);

    // Create OPML service
    service = new OPMLService(mockServiceContainer as unknown as ServiceContainer);
  });

  describe('importOPML', () => {
    it('should successfully import valid OPML content', async () => {
      const validOPML = `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>My Feed Subscriptions</title>
          </head>
          <body>
            <outline text="Tech">
              <outline type="rss" text="Example Feed" xmlUrl="http://example.com/feed.xml" />
              <outline type="rss" text="Another Feed" xmlUrl="http://another.com/feed.xml" />
            </outline>
          </body>
        </opml>
      `;

      mockAddFeed
        .mockResolvedValueOnce({ id: 1 } as RSSFeedConfig)
        .mockResolvedValueOnce({ id: 2 } as RSSFeedConfig);

      const result = await service.importOPML(1, validOPML);

      expect(result.added).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockAddFeed).toHaveBeenCalledTimes(2);
      expect(mockAddFeed).toHaveBeenCalledWith(1, 'http://example.com/feed.xml');
      expect(mockAddFeed).toHaveBeenCalledWith(1, 'http://another.com/feed.xml');
    });

    it('should handle feed import failures', async () => {
      const validOPML = `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>My Feed Subscriptions</title>
          </head>
          <body>
            <outline text="Tech">
              <outline type="rss" text="Example Feed" xmlUrl="http://example.com/feed.xml" />
              <outline type="rss" text="Invalid Feed" xmlUrl="http://invalid.com/feed.xml" />
            </outline>
          </body>
        </opml>
      `;

      mockAddFeed
        .mockResolvedValueOnce({ id: 1 } as RSSFeedConfig)
        .mockRejectedValueOnce(new Error('Invalid feed URL'));

      const result = await service.importOPML(1, validOPML);

      expect(result.added).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        url: 'http://invalid.com/feed.xml',
        error: 'Invalid feed URL'
      });
    });

    it('should handle invalid OPML format', async () => {
      const invalidOPML = `
        <?xml version="1.0" encoding="UTF-8"?>
        <invalid>
          <content>This is not OPML</content>
        </invalid>
      `;

      await expect(service.importOPML(1, invalidOPML))
        .rejects
        .toThrow('Invalid OPML file format');

      expect(mockAddFeed).not.toHaveBeenCalled();
    });

    it('should handle empty OPML file', async () => {
      const emptyOPML = `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>Empty Feed List</title>
          </head>
          <body>
            <outline text="Empty Category">
            </outline>
          </body>
        </opml>
      `;

      const result = await service.importOPML(1, emptyOPML);

      expect(result.added).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockAddFeed).not.toHaveBeenCalled();
    });

    it('should handle nested OPML structure', async () => {
      const nestedOPML = `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>Nested Feeds</title>
          </head>
          <body>
            <outline text="Tech">
              <outline text="News">
                <outline type="rss" text="Tech News" xmlUrl="http://tech.com/feed.xml" />
              </outline>
              <outline text="Blogs">
                <outline text="Programming">
                  <outline type="rss" text="Code Blog" xmlUrl="http://code.com/feed.xml" />
                </outline>
              </outline>
            </outline>
          </body>
        </opml>
      `;

      mockAddFeed
        .mockResolvedValueOnce({ id: 1 } as RSSFeedConfig)
        .mockResolvedValueOnce({ id: 2 } as RSSFeedConfig);

      const result = await service.importOPML(1, nestedOPML);

      expect(result.added).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockAddFeed).toHaveBeenCalledTimes(2);
      expect(mockAddFeed).toHaveBeenCalledWith(1, 'http://tech.com/feed.xml');
      expect(mockAddFeed).toHaveBeenCalledWith(1, 'http://code.com/feed.xml');
    });

    it('should handle malformed XML', async () => {
      const malformedXML = `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>Malformed Feed List</title>
          </head>
          <body>
            <outline text="Tech">
              <outline type="rss" text="Example Feed" xmlUrl="http://example.com/feed.xml" />
            </outline>
          </body>
        </opml
      `; // Note the missing closing bracket

      await expect(service.importOPML(1, malformedXML))
        .rejects
        .toThrow('Invalid OPML file format');
    });

    it('should handle OPML with invalid feed URLs', async () => {
      const opmlWithInvalidURLs = `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>Invalid URLs</title>
          </head>
          <body>
            <outline text="Tech">
              <outline type="rss" text="Invalid Feed 1" xmlUrl="not-a-url" />
              <outline type="rss" text="Invalid Feed 2" xmlUrl="ftp://invalid-protocol.com" />
              <outline type="rss" text="Valid Feed" xmlUrl="http://example.com/feed.xml" />
            </outline>
          </body>
        </opml>
      `;

      mockAddFeed
        .mockRejectedValueOnce(new Error('Invalid URL format'))
        .mockRejectedValueOnce(new Error('Unsupported protocol'))
        .mockResolvedValueOnce({ id: 1 } as RSSFeedConfig);

      const result = await service.importOPML(1, opmlWithInvalidURLs);

      expect(result.added).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toBe('Invalid URL format');
      expect(result.errors[1].error).toBe('Unsupported protocol');
    });

    it('should handle duplicate feeds', async () => {
      const opmlWithDuplicates = `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>Duplicate Feeds</title>
          </head>
          <body>
            <outline text="Tech">
              <outline type="rss" text="Feed 1" xmlUrl="http://example.com/feed.xml" />
              <outline type="rss" text="Feed 2" xmlUrl="http://example.com/feed.xml" />
            </outline>
          </body>
        </opml>
      `;

      mockAddFeed
        .mockResolvedValueOnce({ id: 1 } as RSSFeedConfig)
        .mockRejectedValueOnce(new Error('Feed URL already exists'));

      const result = await service.importOPML(1, opmlWithDuplicates);

      expect(result.added).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Feed URL already exists');
    });

    it('should handle OPML with missing required attributes', async () => {
      const opmlWithMissingAttrs = `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>Missing Attributes</title>
          </head>
          <body>
            <outline text="Tech">
              <outline type="rss" text="Missing URL" />
              <outline type="rss" xmlUrl="http://example.com/feed.xml" />
              <outline text="Complete Feed" type="rss" xmlUrl="http://example.com/complete.xml" />
            </outline>
          </body>
        </opml>
      `;

      mockAddFeed
        .mockResolvedValueOnce({ id: 1 } as RSSFeedConfig)
        .mockResolvedValueOnce({ id: 2 } as RSSFeedConfig);

      const result = await service.importOPML(1, opmlWithMissingAttrs);

      expect(result.added).toBe(2);
      expect(result.failed).toBe(0);
      // Missing attributes should be skipped without counting as failures
      expect(result.errors).toHaveLength(0);
    });

    it('should handle large OPML files', async () => {
      // Generate a large OPML file
      const generateLargeOPML = (count: number) => `
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="1.0">
          <head>
            <title>Large Feed List</title>
          </head>
          <body>
            <outline text="Tech">
              ${Array.from({ length: count }, (_, i) => 
                `<outline type="rss" text="Feed ${i}" xmlUrl="http://example.com/feed${i}.xml" />`
              ).join('\n')}
            </outline>
          </body>
        </opml>
      `;

      const FEED_COUNT = 110;
      const opmlWithManyFeeds = generateLargeOPML(FEED_COUNT);

      // Mock successful feed additions
      for (let i = 0; i < FEED_COUNT; i++) {
        mockAddFeed.mockResolvedValueOnce({ id: i } as RSSFeedConfig);
      }

      const result = await service.importOPML(1, opmlWithManyFeeds);

      expect(result.added).toBe(FEED_COUNT);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
}); 
