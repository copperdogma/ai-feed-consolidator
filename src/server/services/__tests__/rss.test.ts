import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { RSSService } from '../rss/rss-service';
import { RSSFetcher } from '../rss/rss-fetcher';
import { RSSParser } from '../rss/rss-parser';
import { TransactionManager } from '../transaction-manager';
import { FeedRepository } from '../rss/feed-repository';
import { FeedHealthService } from '../feed-health';
import { setupTestEnvironment, cleanupTestEnvironment, createTestUser } from '../../../tests/utils/test-setup-helpers';
import { ServiceContainer } from '../service-container';
import { DatabaseStateManager } from '../../../tests/utils/setup-test-db';
import { TestDataFactory } from '../../../tests/utils/factories';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { logger } from '../../logger';
import { PoolClient } from 'pg';
import { KijijiHandler } from '../rss/kijiji-handler';
import { randomUUID } from 'crypto';

// Sample feed XML
const SAMPLE_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>http://example.com</link>
    <description>Test Description</description>
    <item>
      <title>Test Item</title>
      <link>http://example.com/item</link>
      <description>Test Item Description</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

// Mock server for testing
const mockServer = {
  listen: vi.fn(),
  close: vi.fn(),
};

// Mock fetch responses
const mockFetch = vi.fn();

// Setup mock for fetch
vi.mock('node-fetch', () => ({
  default: (url: string) => mockFetch(url),
}));

// Mock server setup
vi.mock('http', () => ({
  createServer: () => mockServer,
}));

describe('RSS Service Tests', () => {
  let service: RSSService;
  let container: ServiceContainer;
  let dbManager: DatabaseStateManager;
  let testDataFactory: TestDataFactory;
  let testUserId: number;
  let server: ReturnType<typeof setupServer>;
  let pool: any;
  const testSuiteId = `rss-test-${Date.now()}-${randomUUID().substring(0, 5)}`;

  beforeAll(async () => {
    try {
      // Setup mock server
      server = setupServer(
        // Valid feed
        http.get('http://example.com/feed.xml', () => {
          return new HttpResponse(SAMPLE_FEED_XML, {
            headers: { 'Content-Type': 'application/xml' },
            status: 200
          });
        }),
        
        // Invalid feed
        http.get('http://invalid.example.com/feed.xml', () => {
          return new HttpResponse('Invalid XML content', {
            headers: { 'Content-Type': 'text/plain' },
            status: 200
          });
        }),
        
        // Timeout simulation
        http.get('http://timeout.example.com/feed.xml', () => {
          return new Response(null, { status: 408 });
        }),
        
        // Network error
        http.get('http://network-error.example.com/feed.xml', () => {
          return new Response(null, { status: 503 });
        })
      );
      
      // Initialize database connection
      dbManager = DatabaseStateManager.getInstance();
      await dbManager.initialize();
      await dbManager.registerTestSuite(testSuiteId);
      
      // Get the database pool
      pool = dbManager.getPool();
      
      // Initialize service container and register the pool
      container = ServiceContainer.getInstance();
      container.setTestSuiteId(testSuiteId);
      container.register('pool', pool);
      await container.initialize();
      
      // Initialize test data factory
      testDataFactory = TestDataFactory.getInstance();
      await testDataFactory.initialize(pool);
      
      await server.listen({ onUnhandledRequest: 'error' });
      
      logger.info('RSS test setup completed successfully');
    } catch (error) {
      logger.error('Failed to set up RSS test environment:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      server.close();
      
      // Clear the service container
      await container.clear();
      
      // Unregister test suite
      await dbManager.unregisterTestSuite(testSuiteId);
      
      logger.info('RSS test cleanup completed successfully');
    } catch (error) {
      logger.error('Failed to clean up RSS test environment:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    try {
      // Clean the database before each test
      await dbManager.cleanDatabase();
      
      // Reset the service container but keep the pool
      await container.clear();
      
      // Re-register the pool
      container.register('pool', pool);
      await container.initialize();
      
      // Register services in dependency order
      container.registerFactory('rssFetcher', () => new RSSFetcher({
        userAgent: 'AI Feed Consolidator Test/1.0',
        fallbackUserAgent: 'Mozilla/5.0 (Test)',
        timeoutMs: 5000
      }));
      container.registerFactory('rssParser', () => new RSSParser());
      container.registerFactory('feedRepository', () => new FeedRepository(container));
      container.registerFactory('feedHealthService', () => new FeedHealthService(container));
      container.registerFactory('kijijiHandler', () => new KijijiHandler());
      container.registerFactory('rssService', (c) => new RSSService(c));
      
      // Get RSS service instance
      service = container.getService<RSSService>('rssService');
      
      // Create test user
      const user = await createTestUser(testDataFactory);
      testUserId = user.id;
      
      // Reset mocks
      mockFetch.mockReset();
      
      logger.info('RSS test setup completed with user ID:', testUserId);
    } catch (error) {
      logger.error('Failed to set up individual RSS test:', error);
      throw error;
    }
  });

  afterEach(async () => {
    // Clean up the environment
    await container.clear();
    logger.info('RSS test environment cleaned up');
  });

  async function createTestFeedConfig(url: string) {
    const transactionManager = container.getService<TransactionManager>('transactionManager');
    
    // Use transaction manager to handle transactions properly
    return await transactionManager.withTransaction(async (client: PoolClient) => {
      try {
        // Create feed config
        const feedConfigResult = await client.query(`
          INSERT INTO feed_configs (
            user_id, feed_url, feed_type, title, description, site_url, 
            is_active, last_fetched_at, created_at, updated_at
          ) VALUES (
            $1, $2, 'rss', 'Test Feed', 'Test Description', 'http://example.com',
            true, NULL, NOW(), NOW()
          ) RETURNING *
        `, [testUserId, url]);
        
        const feedConfig = feedConfigResult.rows[0];

        // Create feed health record
        await client.query(`
          INSERT INTO feed_health (
            feed_config_id, last_check_at, consecutive_failures, is_permanently_invalid,
            requires_special_handling, special_handler_type, created_at, updated_at
          ) VALUES (
            $1, NOW(), 0, false, false, NULL, NOW(), NOW()
          ) RETURNING *
        `, [feedConfig.id]);

        // Verify the records were created
        const verifyConfigResult = await client.query(
          'SELECT * FROM feed_configs WHERE id = $1', 
          [feedConfig.id]
        );
        
        if (verifyConfigResult.rows.length === 0) {
          throw new Error('Failed to verify feed config record');
        }

        return feedConfig;
      } catch (error) {
        logger.error('Error creating test feed config:', error);
        throw error;
      }
    });
  }

  it('should poll and parse RSS feed successfully', async () => {
    const feedConfig = await createTestFeedConfig('http://example.com/feed.xml');
    const result = await service.pollFeed(feedConfig.id);
    
    expect(result.success).toBe(true);
    expect(result.items).toBeDefined();
    expect(result.items?.length).toBeGreaterThan(0);
    expect(result.items?.[0].title).toBe('Test Item');
  });

  it('should handle feed validation errors', async () => {
    const feedConfig = await createTestFeedConfig('http://invalid.example.com/feed.xml');
    const result = await service.pollFeed(feedConfig.id);
    
    expect(result.success).toBe(false);
    expect(result.error?.category).toBe('PARSE_ERROR');
  });

  it('should handle timeouts gracefully', async () => {
    const feedConfig = await createTestFeedConfig('http://timeout.example.com/feed.xml');
    const result = await service.pollFeed(feedConfig.id);
    
    expect(result.success).toBe(false);
    expect(result.error?.category).toBe('TIMEOUT');
  });

  it('should handle network errors appropriately', async () => {
    const feedConfig = await createTestFeedConfig('http://network-error.example.com/feed.xml');
    const result = await service.pollFeed(feedConfig.id);
    
    expect(result.success).toBe(false);
    expect(result.error?.category).toBe('NETWORK_ERROR');
  });
}); 