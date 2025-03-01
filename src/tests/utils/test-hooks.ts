import { beforeAll, afterAll, afterEach } from 'vitest';
import { DatabaseStateManager } from './setup-test-db';
import { ServiceContainer } from '../../server/services/service-container';
import { TestDataFactory } from './test-data-factory';
import { logger } from '../../server/logger';

// Export singleton instances for tests to use
export let dbManager: DatabaseStateManager;
export let container: ServiceContainer;
export let testDataFactory: TestDataFactory;

// Generate a unique test suite ID
const testSuiteId = `test-suite-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

// Setup before all tests
beforeAll(async () => {
  try {
    // Initialize database manager first
    dbManager = DatabaseStateManager.getInstance();
    await dbManager.initialize();

    // Register this test suite with the database manager
    await dbManager.registerTestSuite(testSuiteId);

    // Get database pool and verify it's ready
    const pool = dbManager.getPool();
    if (!pool) {
      throw new Error('Database pool not initialized');
    }

    // Initialize service container
    container = ServiceContainer.getInstance();

    // Set test suite ID for isolation
    container.setTestSuiteId(testSuiteId);

    // Register the pool with the container
    container.register('pool', pool);
    container.register('databasePool', pool);

    // Initialize container
    await container.initialize();

    // Initialize test data factory last
    testDataFactory = TestDataFactory.getInstance();
    await testDataFactory.initialize(pool);

    logger.info({ testSuiteId }, 'Test setup completed successfully');
  } catch (error) {
    logger.error('Error in test setup:', error);
    // Attempt cleanup if initialization fails
    await cleanup();
    throw error;
  }
}, 60000); // Increased timeout for initialization

// Clean up after each test
afterEach(async () => {
  // First try to reset the service container - don't throw on error
  try {
    if (container) {
      // Reset the service container to clear any registered services
      // but maintain the core services like the database pool
      await container.clear();
    }
    
    if (testDataFactory) {
      // Reset sequence counters in the test data factory
      testDataFactory.resetSequences();
    }
  } catch (error) {
    logger.error('Error resetting service container during cleanup:', error);
    // Do not throw - we still want to attempt database cleanup
  }
  
  // Then try to clean the database - don't throw on error
  try {
    if (dbManager) {
      // First try to verify the database is initialized
      try {
        // If no error was thrown, clean the database
        await dbManager.cleanDatabase();
      } catch (error) {
        logger.warn('Database cleanup error, attempting to reinitialize:', error);
        
        // Try to reinitialize and then clean
        try {
          await dbManager.initialize();
          await dbManager.cleanDatabase();
        } catch (retryError) {
          logger.error('Failed to reinitialize and clean database:', retryError);
          // Don't throw - continue with tests
        }
      }
    }
  } catch (error) {
    logger.error('Error cleaning database during cleanup:', error);
    // Do not throw error here to allow tests to continue
  }
});

// Final cleanup after all tests
afterAll(async () => {
  await cleanup();
}, 30000); // 30 second timeout for cleanup

// Shared cleanup function
async function cleanup() {
  try {
    // Reset all singletons in reverse order of initialization
    if (testDataFactory) {
      TestDataFactory.resetInstance();
    }
    
    if (container) {
      try {
        await container.clear();
        ServiceContainer.resetInstance();
      } catch (error) {
        logger.error('Error cleaning up service container:', error);
      }
    }
    
    // Shutdown database manager last
    if (dbManager) {
      try {
        await dbManager.unregisterTestSuite(testSuiteId);
      } catch (error) {
        logger.error('Error unregistering test suite:', error);
      }
    }

    logger.info('Test teardown completed successfully');
  } catch (error) {
    logger.error('Error in test teardown:', error);
    // Don't throw to avoid masking other errors
  }
} 