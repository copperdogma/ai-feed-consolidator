import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { DatabaseCleanupService } from '../services/database-cleanup-service';
import { TestDataFactory } from '../../tests/utils/factories';
import { ServiceContainer } from '../services/service-container';
import { DatabaseStateManager } from '../../tests/utils/setup-test-db';
import { randomUUID } from 'crypto';
import { logger } from '../logger';
import { registerStandardServices, ServiceRegistrationType } from '../../tests/utils/register-standard-services';

describe('DatabaseCleanupService', () => {
  let cleanupService: DatabaseCleanupService;
  let testDataFactory: TestDataFactory;
  let container: ServiceContainer;
  let pool: any;
  let dbManager: DatabaseStateManager;
  const testSuiteId = `db-cleanup-test-${randomUUID()}`;

  beforeAll(async () => {
    try {
      // Get database manager instance
      dbManager = DatabaseStateManager.getInstance();
      
      // Register test suite with the database manager
      await dbManager.registerTestSuite(testSuiteId);
      
      // Acquire a connection for this test suite
      pool = await dbManager.acquireConnection(testSuiteId);
      
      if (!pool) {
        throw new Error('Failed to acquire database connection');
      }
      
      // Initialize service container with the pool
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      container.register('pool', pool);
      container.register('databasePool', pool);
      
      logger.info('Database initialized for cleanup tests');
    } catch (error) {
      logger.error('Error initializing database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Release the connection and unregister test suite to clean up resources
      await dbManager.releaseConnection(testSuiteId);
      await dbManager.unregisterTestSuite(testSuiteId);
      logger.info('Test suite unregistered and connection released');
    } catch (error) {
      logger.error('Error unregistering test suite:', error);
    }
  });

  beforeEach(async () => {
    try {
      // Clean database state
      try {
        await dbManager.cleanDatabase();
      } catch (error) {
        logger.warn('Could not clean database:', error);
        // If cleaning fails, try to reinitialize the connection
        pool = await dbManager.acquireConnection(testSuiteId);
        if (!pool) {
          throw new Error('Failed to reacquire database connection');
        }
        container.register('pool', pool);
        container.register('databasePool', pool);
      }
      
      // Reset service container but keep the pool registered
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      container.register('pool', pool);
      container.register('databasePool', pool);
      await container.initialize();
      
      // Use registerStandardServices for consistent initialization
      await registerStandardServices(
        container,
        pool,
        ServiceRegistrationType.ALL,
        {
          skipServices: ['openaiService'],
          verbose: true
        }
      );

      // Initialize test data factory
      testDataFactory = TestDataFactory.getInstance();
      await testDataFactory.initialize(pool);

      // Get cleanup service instance
      cleanupService = new DatabaseCleanupService(container);
      
      logger.info('Test environment setup completed successfully for cleanup test');
    } catch (error) {
      logger.error('Error in test setup:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      try {
        await dbManager.cleanDatabase();
        logger.info('Database cleaned successfully');
      } catch (error) {
        logger.warn('Could not clean database in afterEach:', error);
      }
      
      if (container) {
        await container.clear();
        logger.info('Service container cleared successfully');
      }
      
      // Reset test data factory
      await TestDataFactory.getInstance().reset();
    } catch (error) {
      logger.error('Error in test cleanup:', error);
    }
  });

  it('should clean up expired sessions', async () => {
    try {
      // Create a user with an expired session
      const { user } = await testDataFactory.createUserWithFeed({
        user: {
          google_id: `test-google-id-${randomUUID()}`,
          email: `test-${randomUUID()}@example.com`
        }
      });

      // Insert an expired session
      await pool.query(
        'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, NOW() - INTERVAL \'1 day\')',
        [user.id, randomUUID()]
      );

      // Run cleanup
      await cleanupService.cleanupExpiredSessions();

      // Verify session was cleaned up
      const count = await pool.one(
        'SELECT COUNT(*)::int as count FROM sessions WHERE user_id = $1',
        [user.id]
      );

      // Now check the count
      expect(count).toBeDefined();
      expect(count.count).toBe(0);
    } catch (error) {
      logger.error('Error in test "should clean up expired sessions":', error);
      throw error;
    }
  });

  it('should maintain referential integrity during cleanup', async () => {
    try {
      // Create a user with feed config and feed health
      const { user } = await testDataFactory.createUserWithFeed({
        user: {
          google_id: `test-google-id-${randomUUID()}`,
          email: `test-${randomUUID()}@example.com`
        }
      });
      
      const feedConfig = await testDataFactory.createFeedConfig(user.id);
      await testDataFactory.createFeedHealth(feedConfig.id);

      // Insert an expired session
      await pool.query(
        'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, NOW() - INTERVAL \'1 day\')',
        [user.id, randomUUID()]
      );

      // Run cleanup
      await cleanupService.cleanupExpiredSessions();

      // Verify session was cleaned up but other records remain
      const sessionCount = await pool.one(
        'SELECT COUNT(*)::int as count FROM sessions WHERE user_id = $1',
        [user.id]
      );
      
      expect(sessionCount).toBeDefined();
      expect(sessionCount.count).toBe(0);

      // Verify feed config still exists
      const feedConfigCount = await pool.one(
        'SELECT COUNT(*)::int as count FROM feed_configs WHERE user_id = $1',
        [user.id]
      );
      expect(feedConfigCount.count).toBe(2);

      // Verify feed health still exists
      const feedHealthCount = await pool.one(
        'SELECT COUNT(*)::int as count FROM feed_health WHERE feed_config_id = $1',
        [feedConfig.id]
      );
      expect(feedHealthCount.count).toBe(1);
    } catch (error) {
      logger.error('Error in test "should maintain referential integrity during cleanup":', error);
      throw error;
    }
  });

  it('should handle concurrent cleanup operations safely', async () => {
    try {
      // Create multiple users with expired sessions
      const users = await Promise.all([
        testDataFactory.createUserWithFeed({
          user: {
            google_id: `test-google-id-${randomUUID()}`,
            email: `test1-${randomUUID()}@example.com`
          }
        }),
        testDataFactory.createUserWithFeed({
          user: {
            google_id: `test-google-id-${randomUUID()}`,
            email: `test2-${randomUUID()}@example.com`
          }
        }),
        testDataFactory.createUserWithFeed({
          user: {
            google_id: `test-google-id-${randomUUID()}`,
            email: `test3-${randomUUID()}@example.com`
          }
        })
      ]);

      // Insert expired sessions for all users
      await Promise.all(users.map(({ user }) => 
        pool.query(
          'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, NOW() - INTERVAL \'1 day\')',
          [user.id, randomUUID()]
        )
      ));

      // Run multiple cleanup operations concurrently
      await Promise.all([
        cleanupService.cleanupExpiredSessions(),
        cleanupService.cleanupExpiredSessions(),
        cleanupService.cleanupExpiredSessions()
      ]);

      // Verify all sessions were cleaned up
      const count = await pool.one(
        'SELECT COUNT(*)::int as count FROM sessions'
      );

      expect(count).toBeDefined();
      expect(count.count).toBe(0);
    } catch (error) {
      logger.error('Error in test "should handle concurrent cleanup operations safely":', error);
      throw error;
    }
  });
}); 