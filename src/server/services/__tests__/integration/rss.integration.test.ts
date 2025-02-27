import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseStateManager } from '../../../../tests/utils/setup-test-db';
import { TestDataFactory } from '../../../../tests/utils/factories';
import { RSSService } from '../../rss/rss-service';
import { ServiceContainer } from '../../service-container';
import { logger } from '../../../logger';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { HttpResponse } from 'msw';
import '../../../../tests/utils/test-hooks';
import { registerStandardServices, ServiceRegistrationType } from '../../../../tests/utils/register-standard-services';
import { IDatabase } from 'pg-promise';

// Run tests in sequence, not in parallel
describe.sequential('RSSService Integration', () => {
  let service: RSSService;
  let dbManager: DatabaseStateManager;
  let pool: IDatabase<any>;
  let container: ServiceContainer;
  let factory: TestDataFactory;
  let testUser: any;
  const testSuiteId = 'rss-integration-test-' + Date.now();
  const server = setupServer();

  beforeAll(async () => {
    try {
      logger.info('Starting RSSService integration test setup');
      
      // Get existing instances (don't shut down the global one)
      dbManager = DatabaseStateManager.getInstance();
      
      // Make sure DB is initialized
      try {
        logger.info('Ensuring database is initialized');
        await dbManager.initialize();
        logger.info('Database is initialized');
      } catch (err) {
        logger.error('Error initializing database:', err);
        throw err;
      }
      
      // Get database pool
      try {
        logger.info('Getting database pool');
        pool = dbManager.getPool();
        logger.info('Successfully got database pool');
      } catch (err) {
        logger.error('Error getting database pool:', err);
        throw err;
      }
      
      // Reset and initialize service container
      logger.info('Setting up service container');
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      container.register('pool', pool);
      container.register('databasePool', pool);
      
      // Initialize container
      logger.info('Initializing container');
      await container.initialize();
      
      // Register standard services
      logger.info('Registering standard services');
      await registerStandardServices(container, pool, ServiceRegistrationType.RSS, {
        verbose: true
      });

      // Get RSS service from container
      service = container.getService<RSSService>('rssService');

      // Initialize test data factory
      logger.info('Initializing test data factory');
      factory = TestDataFactory.getInstance();
      await factory.initialize(pool);

      // Setup mock handlers
      logger.info('Setting up mock HTTP handlers');
      server.use(
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
        
        // Add handler for nonexistent URL with 404 response
        http.get('http://nonexistent.example.com/feed.xml', () => {
          return new HttpResponse(null, { status: 404 });
        }),
        
        // Add handler for error URL with 500 response
        http.get('http://error.example.com/feed.xml', () => {
          return new HttpResponse('Internal Server Error', { 
            status: 500, 
            statusText: 'Internal Server Error'
          });
        })
      );

      await server.listen({ onUnhandledRequest: 'error' });

      logger.info('RSS Service integration test setup complete');
    } catch (error) {
      logger.error('Error in RSS Service test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      logger.info('Starting RSS Service test cleanup');
      
      // Close the mock server
      await server.close();
      
      // Only clear the container, don't shut down database
      await container.clear();
      
      // Reset service container
      ServiceContainer.resetInstance();
      
      logger.info('RSS Service test cleanup completed successfully');
    } catch (error) {
      logger.error('Error in RSS Service test cleanup:', error);
    }
  });

  beforeEach(async () => {
    try {
      logger.info('RSS Service test beforeEach - cleaning database');
      await dbManager.cleanDatabase();
      
      // Create test user
      logger.info('Creating test user for RSS Service test');
      testUser = await factory.createUser({
        google_id: 'test-google-id',
        email: `test-${Date.now()}@example.com`, // Use unique email to avoid conflicts
        display_name: 'Test User'
      });

      // Verify user was created
      const verifyUser = await pool.oneOrNone('SELECT * FROM users WHERE id = $1', [testUser.id]);
      if (!verifyUser) {
        throw new Error('Failed to verify user creation');
      }
      logger.info('Test user created successfully with ID:', testUser.id);
    } catch (error) {
      logger.error('Error in RSS Service test beforeEach:', error);
      throw error;
    }
  });

  it('should fetch and parse a real RSS feed', async () => {
    logger.info('Starting test: fetch and parse real RSS feed');
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
    expect(verifyConfig.user_id).toBe(testUser.id);

    await service.pollFeed(feed.id);

    // Verify feed items were created
    const items = await pool.manyOrNone('SELECT * FROM feed_items WHERE feed_config_id = $1', [feed.id]);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].title).toBe('Test Item');

    // Verify feed health was updated
    const health = await pool.oneOrNone('SELECT * FROM feed_health WHERE feed_config_id = $1', [feed.id]);
    expect(health).toBeDefined();
    expect(health.consecutive_failures).toBe(0);
    expect(health.is_permanently_invalid).toBe(false);
    logger.info('Test completed: fetch and parse real RSS feed');
  });

  it('should handle invalid feed URLs', async () => {
    logger.info('Starting test: handle invalid feed URLs');
    const feedUrl = 'http://nonexistent.example.com/feed.xml';
    await expect(service.addFeed(testUser.id, feedUrl)).rejects.toThrow();

    // Verify no feed config was created
    const configs = await pool.manyOrNone('SELECT * FROM feed_configs WHERE user_id = $1', [testUser.id]);
    expect(configs.length).toBe(0);
    logger.info('Test completed: handle invalid feed URLs');
  });

  it('should handle network errors gracefully', async () => {
    logger.info('Starting test: handle network errors gracefully');
    server.use(
      http.get('http://error.example.com/feed.xml', () => {
        return new HttpResponse('Internal Server Error', { 
          status: 500, 
          statusText: 'Internal Server Error' 
        });
      })
    );

    const feedUrl = 'http://error.example.com/feed.xml';
    const feed = await service.addFeed(testUser.id, feedUrl);

    expect(feed).toBeDefined();
    expect(feed.userId).toBe(testUser.id);

    await service.pollFeed(feed.id);

    // Verify feed health was updated with error
    const health = await pool.oneOrNone('SELECT * FROM feed_health WHERE feed_config_id = $1', [feed.id]);
    expect(health).toBeDefined();
    expect(health.consecutive_failures).toBe(1);
    expect(health.last_error_category).toBe('NETWORK_ERROR');
    logger.info('Test completed: handle network errors gracefully');
  });
});