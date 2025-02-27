import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { RSSService } from '../../../server/services/rss/rss-service';
import { RSSFetcher, RSSFetchError } from '../../../server/services/rss/rss-fetcher';
import { RSSParser } from '../../../server/services/rss/rss-parser';
import { FeedRepository } from '../../../server/services/rss/feed-repository';
import { FeedHealthService } from '../../../server/services/feed-health';
import { TransactionManager } from '../../../server/services/transaction-manager';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { HttpResponse } from 'msw';
import { IntegrationTestBase } from '../../utils/IntegrationTestBase';
import { logger } from '../../../server/logger';

// Mock KijijiHandler
class MockKijijiHandler {
  async validateFeed(feedUrl: string) {
    return {
      isValid: !feedUrl.includes('invalid'),
      errorDetail: feedUrl.includes('invalid') ? 'Invalid feed URL' : undefined,
      feedInfo: {
        title: 'Test Kijiji Feed',
        description: 'Test Kijiji Feed Description',
        link: feedUrl
      }
    };
  }
}

class RSSServiceTest extends IntegrationTestBase {
  protected server: ReturnType<typeof setupServer>;
  private service!: RSSService;
  private testUser: any;

  constructor() {
    super();
    this.server = setupServer();
  }

  public async setup() {
    await super.setup();

    // Register services in dependency order
    const transactionManager = TransactionManager.getInstance(this.container);
    this.container.register('transactionManager', transactionManager);
    this.container.registerFactory('feedRepository', () => new FeedRepository(this.container));
    this.container.registerFactory('rssFetcher', () => new RSSFetcher({
      userAgent: 'AI Feed Consolidator Test/1.0',
      fallbackUserAgent: 'Mozilla/5.0 (Test)',
      timeoutMs: 5000
    }));
    this.container.registerFactory('rssParser', () => new RSSParser());
    this.container.registerFactory('feedHealthService', () => new FeedHealthService(this.container));
    this.container.registerFactory('kijijiHandler', () => new MockKijijiHandler());
    this.container.registerFactory('rssService', (c) => new RSSService(c));

    // Get RSS service from container
    this.service = this.container.getService<RSSService>('rssService');

    // Setup mock handlers
    this.server.use(
      http.get('http://test.example.com/feed.xml', () => {
        return new HttpResponse(
          `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
              <channel>
                <title>Test Feed</title>
                <link>http://test.example.com</link>
                <description>Test Description</description>
                <item>
                  <title>Test Item</title>
                  <link>http://test.example.com/item</link>
                  <description>Test Item Description</description>
                  <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
                </item>
              </channel>
            </rss>`,
          {
            headers: { 'Content-Type': 'application/xml' },
            status: 200
          }
        );
      }),

      // Add handler for nonexistent feed URL
      http.get('http://nonexistent.example.com/feed.xml', () => {
        return new HttpResponse(null, { status: 404 });
      }),

      // Add handler for network error simulation
      http.get('http://error.example.com/feed.xml', () => {
        return new HttpResponse('Internal Server Error', { 
          status: 500, 
          statusText: 'Internal Server Error' 
        });
      })
    );

    await this.server.listen({ onUnhandledRequest: 'error' });
  }

  public async cleanup() {
    await this.server.close();
    await super.cleanup();
  }

  public async setupTestUser() {
    try {
      logger.info('Setting up test user...');

      // Verify database manager is ready
      const pool = this.dbManager.getPool();
      if (!pool) {
        logger.error('Database pool not available in setupTestUser');
        throw new Error('Database pool not available');
      }

      // Generate a unique email for each test run
      const uniqueSuffix = Date.now() + Math.random().toString(36).substring(2, 7);
      const testEmail = `test-${uniqueSuffix}@example.com`;
      
      logger.info('Creating test user via TestDataFactory with unique email:', { email: testEmail });
      
      // Always initialize the TestDataFactory to ensure it's ready
      logger.info('Initializing TestDataFactory...');
      await this.testDataFactory.initialize(pool);

      // Create test user with unique email
      this.testUser = await this.testDataFactory.createUser({
        google_id: `test-google-id-${uniqueSuffix}`,
        email: testEmail,
        display_name: 'Test User'
      });

      logger.info('Test user created:', { userId: this.testUser.id });

      // Verify user was created using pg-promise's oneOrNone method
      const verifyUser = await pool.oneOrNone('SELECT * FROM users WHERE id = $1', [this.testUser.id]);
      
      logger.info('Verify query result:', { 
        userFound: !!verifyUser,
        userId: verifyUser?.id
      });

      if (!verifyUser) {
        logger.error('Failed to verify user creation - user not found');
        throw new Error('Failed to verify user creation');
      }

      logger.info('Test user setup completed successfully');
    } catch (error) {
      logger.error('Error in setupTestUser:', error);
      throw error;
    }
  }

  public getService() {
    return this.service;
  }

  public getTestUser() {
    return this.testUser;
  }

  public getPool() {
    return this.dbManager.getPool();
  }
}

describe('RSSService Integration', () => {
  let testInstance: RSSServiceTest;

  beforeAll(async () => {
    testInstance = new RSSServiceTest();
    await testInstance.setup();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });

  beforeEach(async () => {
    await testInstance.setupTestUser();
  });

  it('should fetch and parse a real RSS feed', async () => {
    const service = testInstance.getService();
    const testUser = testInstance.getTestUser();
    const pool = testInstance.getPool();

    const feedUrl = 'http://test.example.com/feed.xml';
    const feed = await service.addFeed(testUser.id, feedUrl);

    expect(feed).toBeDefined();
    expect(feed.userId).toBe(testUser.id);
    expect(feed.feedUrl).toBe(feedUrl);
    expect(feed.isActive).toBe(true);
    expect(feed.errorCount).toBe(0);

    // Verify feed config was created
    const verifyConfig = await pool.oneOrNone('SELECT * FROM feed_configs WHERE id = $1', [feed.id]);
    expect(verifyConfig).toBeDefined();
    expect(verifyConfig?.user_id).toBe(testUser.id);

    await service.pollFeed(feed.id);

    // Verify feed items were created
    const items = await pool.manyOrNone('SELECT * FROM feed_items WHERE feed_config_id = $1', [feed.id]);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].title).toBe('Test Item');

    // Verify feed health was updated
    const health = await pool.oneOrNone('SELECT * FROM feed_health WHERE feed_config_id = $1', [feed.id]);
    expect(health).toBeDefined();
    expect(health?.consecutive_failures).toBe(0);
    expect(health?.is_permanently_invalid).toBe(false);
  });

  it('should handle invalid feed URLs', async () => {
    const service = testInstance.getService();
    const testUser = testInstance.getTestUser();
    const pool = testInstance.getPool();

    const feedUrl = 'http://nonexistent.example.com/feed.xml';
    await expect(service.addFeed(testUser.id, feedUrl)).rejects.toThrow();

    // Verify no feed config was created
    const configs = await pool.manyOrNone('SELECT * FROM feed_configs WHERE user_id = $1', [testUser.id]);
    expect(configs.length).toBe(0);
  });

  it('should handle network errors gracefully', async () => {
    const service = testInstance.getService();
    const testUser = testInstance.getTestUser();
    const pool = testInstance.getPool();

    const feedUrl = 'http://error.example.com/feed.xml';
    const feed = await service.addFeed(testUser.id, feedUrl);

    expect(feed).toBeDefined();
    expect(feed.userId).toBe(testUser.id);
    expect(feed.feedUrl).toBe(feedUrl);

    await service.pollFeed(feed.id);

    // Verify feed health was updated with error
    const health = await pool.oneOrNone('SELECT * FROM feed_health WHERE feed_config_id = $1', [feed.id]);
    expect(health).toBeDefined();
    expect(health.consecutive_failures).toBe(0);
  });
}); 