import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { TestSetupHelper } from './utils/test-setup-helper';
import { FeedHealthService } from '../server/services/feed-health-service';
import { logger } from '../server/logger';
import { FeedHealth } from '../server/models/feed-config.model';

describe.sequential('FeedHealthService', () => {
  let testSetup: TestSetupHelper;
  let feedHealthService: FeedHealthService;
  let testUserId: number;
  
  // Test counter to make each test use a unique email
  let testCounter = 0;

  beforeAll(async () => {
    try {
      testSetup = TestSetupHelper.getInstance('feed-health-test');
      await testSetup.initialize();
      feedHealthService = new FeedHealthService(testSetup.getContainer());
      logger.info('FeedHealthService test setup complete');
    } catch (error) {
      logger.error('Error in beforeAll setup:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    try {
      testCounter++;
      // Create test user with a unique email for each test
      const user = await testSetup.getTestDataFactory().createUser({
        email: `test${testCounter}@example.com`,
        display_name: `Test User ${testCounter}`
      });
      testUserId = user.id;
    } catch (error) {
      logger.error('Error in beforeEach setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await testSetup.cleanup();
      TestSetupHelper.resetInstance();
    } catch (error) {
      logger.error('Error in afterAll cleanup:', error);
    }
  });

  it('should create and update feed health record', async () => {
    try {
      const feedConfig = await testSetup.getTestDataFactory().createFeedConfig(testUserId, {
        feed_url: `http://example.com/feed${testCounter}.xml`,
        title: `Test Feed ${testCounter}`
      });

      const now = new Date();
      const health = await feedHealthService.createFeedHealth({
        feed_config_id: feedConfig.id,
        last_check_at: now,
        last_error_at: null,
        last_error_category: null,
        last_error_detail: null,
        consecutive_failures: 0,
        is_permanently_invalid: false,
        requires_special_handling: false,
        special_handler_type: null
      });

      expect(health).toBeDefined();
      expect(health.feed_config_id).toBe(feedConfig.id);
      expect(health.consecutive_failures).toBe(0);
      expect(health.is_permanently_invalid).toBe(false);
    } catch (error) {
      logger.error('Error in create/update feed health test:', error);
      throw error;
    }
  });

  it('should increment consecutive failures', async () => {
    try {
      const feedConfig = await testSetup.getTestDataFactory().createFeedConfig(testUserId, {
        feed_url: `http://example.com/feed${testCounter}.xml`,
        title: `Test Feed ${testCounter}`
      });

      const now = new Date();
      await feedHealthService.createFeedHealth({
        feed_config_id: feedConfig.id,
        last_check_at: now,
        last_error_at: null,
        last_error_category: null,
        last_error_detail: null,
        consecutive_failures: 0,
        is_permanently_invalid: false,
        requires_special_handling: false,
        special_handler_type: null
      });

      const updated = await feedHealthService.updateFeedHealth(feedConfig.id, {
        consecutive_failures: 1,
        last_error_category: 'NOT_FOUND',
        last_error_detail: 'Feed not found',
        last_error_at: now
      });

      expect(updated).toBeDefined();
      expect(updated.consecutive_failures).toBe(1);
      expect(updated.last_error_category).toBe('NOT_FOUND');
    } catch (error) {
      logger.error('Error in increment consecutive failures test:', error);
      throw error;
    }
  });

  it('should reset consecutive failures on success', async () => {
    try {
      const feedConfig = await testSetup.getTestDataFactory().createFeedConfig(testUserId, {
        feed_url: `http://example.com/feed${testCounter}.xml`,
        title: `Test Feed ${testCounter}`
      });

      const now = new Date();
      await feedHealthService.createFeedHealth({
        feed_config_id: feedConfig.id,
        last_check_at: now,
        last_error_at: now,
        last_error_category: 'NOT_FOUND',
        last_error_detail: 'Feed not found',
        consecutive_failures: 1,
        is_permanently_invalid: false,
        requires_special_handling: false,
        special_handler_type: null
      });

      const updated = await feedHealthService.updateFeedHealth(feedConfig.id, {
        consecutive_failures: 0,
        last_error_category: null,
        last_error_detail: null,
        last_error_at: null
      });

      expect(updated).toBeDefined();
      expect(updated.consecutive_failures).toBe(0);
      expect(updated.last_error_category).toBeNull();
    } catch (error) {
      logger.error('Error in reset consecutive failures test:', error);
      throw error;
    }
  });

  it('should handle permanently invalid feeds', async () => {
    try {
      const feedConfig = await testSetup.getTestDataFactory().createFeedConfig(testUserId, {
        feed_url: `http://example.com/feed${testCounter}.xml`,
        title: `Test Feed ${testCounter}`
      });

      const now = new Date();
      await feedHealthService.createFeedHealth({
        feed_config_id: feedConfig.id,
        last_check_at: now,
        last_error_at: null,
        last_error_category: null,
        last_error_detail: null,
        consecutive_failures: 0,
        is_permanently_invalid: false,
        requires_special_handling: false,
        special_handler_type: null
      });

      const updated = await feedHealthService.updateFeedHealth(feedConfig.id, {
        is_permanently_invalid: true,
        consecutive_failures: 5,
        last_error_category: 'GONE',
        last_error_detail: 'Feed permanently removed',
        last_error_at: now
      });

      expect(updated).toBeDefined();
      expect(updated.is_permanently_invalid).toBe(true);
      expect(updated.consecutive_failures).toBe(5);
    } catch (error) {
      logger.error('Error in handle permanently invalid feeds test:', error);
      throw error;
    }
  });

  it('should handle special handling feeds', async () => {
    try {
      const feedConfig = await testSetup.getTestDataFactory().createFeedConfig(testUserId, {
        feed_url: `http://example.com/feed${testCounter}.xml`,
        title: `Test Feed ${testCounter}`
      });

      const now = new Date();
      await feedHealthService.createFeedHealth({
        feed_config_id: feedConfig.id,
        last_check_at: now,
        last_error_at: null,
        last_error_category: null,
        last_error_detail: null,
        consecutive_failures: 0,
        is_permanently_invalid: false,
        requires_special_handling: false,
        special_handler_type: null
      });

      const updated = await feedHealthService.updateFeedHealth(feedConfig.id, {
        requires_special_handling: true,
        special_handler_type: 'USER_AGENT'
      });

      expect(updated).toBeDefined();
      expect(updated.requires_special_handling).toBe(true);
      expect(updated.special_handler_type).toBe('USER_AGENT');
    } catch (error) {
      logger.error('Error in handle special handling feeds test:', error);
      throw error;
    }
  });

  it('should handle concurrent health updates', async () => {
    try {
      const feedConfig = await testSetup.getTestDataFactory().createFeedConfig(testUserId, {
        feed_url: `http://example.com/feed${testCounter}.xml`,
        title: `Test Feed ${testCounter}`
      });

      const now = new Date();
      await feedHealthService.createFeedHealth({
        feed_config_id: feedConfig.id,
        last_check_at: now,
        last_error_at: null,
        last_error_category: null,
        last_error_detail: null,
        consecutive_failures: 0,
        is_permanently_invalid: false,
        requires_special_handling: false,
        special_handler_type: null
      });

      // Perform multiple concurrent health updates
      const updates = Array(5).fill(null).map((_, i) => 
        feedHealthService.updateFeedHealth(feedConfig.id, {
          consecutive_failures: i + 1,
          last_error_category: `ERROR_${i}`,
          last_error_detail: `Error ${i}`,
          last_error_at: now
        })
      );

      await Promise.all(updates);

      const health = await feedHealthService.getFeedHealth(feedConfig.id);
      expect(health).toBeDefined();
      expect(health?.consecutive_failures).toBeGreaterThan(0);
    } catch (error) {
      logger.error('Error in concurrent health updates test:', error);
      throw error;
    }
  });
}); 