import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { IDatabase } from 'pg-promise';
import { TestDataFactory } from '../../../tests/utils/factories';
import { FeedConfigService } from '../feed-config-service';
import { ServiceContainer } from '../service-container';
import { logger } from '../../logger';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../tests/utils/test-setup-helpers';
import { ServiceRegistrationType, registerStandardServices } from '../../../tests/utils/register-standard-services';
import { DatabaseStateManager } from '../../../tests/utils/setup-test-db';

describe('FeedConfigService', () => {
  let pool: IDatabase<any>;
  let service: FeedConfigService;
  let factory: TestDataFactory;
  let testUserId: number;
  let container: ServiceContainer;
  let dbManager: DatabaseStateManager;

  beforeEach(async () => {
    try {
      // Initialize test environment
      const env = await setupTestEnvironment();
      dbManager = env.dbManager;
      container = env.container;
      pool = env.pool;
      
      // Register services including feed services
      await registerStandardServices(container, pool, ServiceRegistrationType.ALL);
      
      // Get service instance
      service = container.getService<FeedConfigService>('feedConfigService');

      // Reset and get test data factory
      TestDataFactory.reset();
      factory = TestDataFactory.getInstance();
      await factory.initialize(pool);

      // Create test user
      const user = await factory.createUser({
        google_id: 'test-google-id',
        email: `test-${Date.now()}@example.com`, // Ensure unique email
        display_name: 'Test User'
      });
      testUserId = user.id;
      
      logger.info('FeedConfigService test setup complete');
    } catch (error) {
      logger.error('Error in beforeEach:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      // Step 1: Try to reset the service container first, before doing database operations
      try {
        ServiceContainer.resetInstance();
        logger.info('Service container reset successfully');
      } catch (err) {
        logger.warn('Error resetting service container:', err);
      }
      
      // Step 2: Try to clean up the test environment, but don't throw if it fails
      try {
        await cleanupTestEnvironment();
        logger.info('FeedConfigService test cleanup complete');
      } catch (err) {
        logger.warn('Error during test environment cleanup:', err);
      }
    } catch (error) {
      logger.error('Error in test cleanup:', error);
      // We don't rethrow here to allow tests to continue even if cleanup fails
    }
  });

  it('should create a feed config', async () => {
    const config = {
      user_id: testUserId,
      feed_url: 'https://example.com/feed.xml',
      feed_type: 'rss',
      title: 'Test Feed',
      description: 'Test feed description',
      site_url: 'https://example.com',
      icon_url: 'https://example.com/icon.png',
      is_active: true,
      fetch_interval_minutes: 60
    };

    const result = await service.createFeedConfig(config);
    expect(result).toBeDefined();
    expect(result.user_id).toBe(testUserId);
    expect(result.feed_url).toBe(config.feed_url);
    expect(result.is_active).toBe(true);
    expect(result.fetch_interval_minutes).toBe(60);

    // Verify in database
    const verifyConfig = await pool.oneOrNone('SELECT * FROM feed_configs WHERE id = $1', [result.id]);
    expect(verifyConfig).toBeDefined();
    expect(verifyConfig.user_id).toBe(testUserId);
  });

  it('should get a feed config by id', async () => {
    // Create a feed config first
    const feedConfig = await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example.com/feed.xml',
      feed_type: 'rss',
      title: 'Test Feed',
      is_active: true,
      fetch_interval_minutes: 60
    });

    const result = await service.getFeedConfig(feedConfig.id);
    expect(result).toBeDefined();
    expect(result!.id).toBe(feedConfig.id);
    expect(result!.user_id).toBe(testUserId);
  });

  it('should get all feed configs for a user', async () => {
    // Create multiple feed configs
    await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example1.com/feed.xml',
      feed_type: 'rss'
    });
    await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example2.com/feed.xml',
      feed_type: 'rss'
    });
    await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example3.com/feed.xml',
      feed_type: 'rss'
    });

    const results = await service.getFeedConfigs(testUserId);
    expect(results).toBeDefined();
    expect(results.length).toBe(3);
    results.forEach(config => {
      expect(config.user_id).toBe(testUserId);
    });
  });

  it('should update a feed config', async () => {
    // Create a feed config first
    const feedConfig = await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example.com/feed.xml',
      feed_type: 'rss',
      title: 'Test Feed',
      is_active: true,
      fetch_interval_minutes: 60
    });

    const updates = {
      is_active: false,
      fetch_interval_minutes: 120
    };

    const result = await service.updateFeedConfig(feedConfig.id, updates);
    expect(result).toBeDefined();
    expect(result!.id).toBe(feedConfig.id);
    expect(result!.is_active).toBe(false);
    expect(result!.fetch_interval_minutes).toBe(120);

    // Verify in database
    const verifyConfig = await pool.oneOrNone('SELECT * FROM feed_configs WHERE id = $1', [feedConfig.id]);
    expect(verifyConfig.is_active).toBe(false);
    expect(verifyConfig.fetch_interval_minutes).toBe(120);
  });

  it('should delete a feed config', async () => {
    // Create a feed config first
    const feedConfig = await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example.com/feed.xml',
      feed_type: 'rss',
      title: 'Test Feed to Delete'
    });

    await service.deleteFeedConfig(feedConfig.id);
    
    // Verify deletion
    const verifyConfig = await pool.oneOrNone('SELECT * FROM feed_configs WHERE id = $1', [feedConfig.id]);
    expect(verifyConfig).toBeNull();
  });

  it('should toggle feed active state', async () => {
    // Create a feed config first with active state = true
    const feedConfig = await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example.com/feed.xml',
      feed_type: 'rss',
      is_active: true
    });

    // Toggle to inactive (true -> false)
    const result = await service.toggleFeedActive(feedConfig.id);
    expect(result).toBeDefined();
    expect(result.is_active).toBe(false);

    // Toggle back to active (false -> true)
    const result2 = await service.toggleFeedActive(feedConfig.id);
    expect(result2).toBeDefined();
    expect(result2.is_active).toBe(true);
  });

  it('should handle validation errors', async () => {
    // Create a feed config first
    const feedConfig = await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example.com/feed.xml',
      feed_type: 'rss'
    });

    const updates = {
      fetch_interval_minutes: -1 // Invalid value
    };

    await expect(service.updateFeedConfig(feedConfig.id, updates))
      .rejects.toThrow(/Validation error/);
  });

  it('should handle non-existent feed config', async () => {
    const nonExistentId = 9999;
    const result = await service.getFeedConfig(nonExistentId);
    expect(result).toBeNull();

    await expect(service.updateFeedConfig(nonExistentId, { title: 'New Title' }))
      .rejects.toThrow(/Feed config not found/);

    await expect(service.deleteFeedConfig(nonExistentId))
      .rejects.toThrow(/Feed config not found/);
  });

  it('should handle concurrent updates', async () => {
    // Create a feed config first
    const feedConfig = await factory.createFeedConfig(testUserId, {
      feed_url: 'https://example.com/feed.xml',
      feed_type: 'rss',
      is_active: true
    });

    // Simulate concurrent updates
    const updates = { is_active: false };
    const promises = Array(5).fill(null).map(() =>
      service.updateFeedConfig(feedConfig.id, updates)
    );

    const results = await Promise.all(promises);

    // All updates should have succeeded
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result!.id).toBe(feedConfig.id);
      expect(result!.is_active).toBe(false);
    });

    // Verify final state
    const verifyConfig = await pool.oneOrNone('SELECT * FROM feed_configs WHERE id = $1', [feedConfig.id]);
    expect(verifyConfig.is_active).toBe(false);
  });
}); 