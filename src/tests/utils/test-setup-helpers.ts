import { ServiceContainer } from '../../server/services/service-container';
import { DatabaseStateManager } from './setup-test-db';
import { TestDataFactory } from './factories';
import { logger } from '../../server/logger';
import { TransactionManager } from '../../server/services/transaction-manager';

/**
 * Helper function to set up database and service container for integration tests
 * Ensures proper initialization order with database pool registered first
 */
export async function setupTestEnvironment(options: { providedPool?: any } = {}) {
  try {
    // Step 1: Initialize database manager and get pool
    const dbManager = DatabaseStateManager.getInstance();
    await dbManager.initialize();
    
    // Use provided pool or get one from dbManager
    const pool = options.providedPool || dbManager.getPool();
    
    // Step 2: Get service container and register pool FIRST
    const container = ServiceContainer.getInstance();
    container.register('pool', pool);
    container.register('databasePool', pool);
    
    // Step 3: Register core transaction manager
    const transactionManager = TransactionManager.getInstance(container);
    container.register('transactionManager', transactionManager);
    
    // Step 4: Initialize container
    await container.initialize();
    
    // Step 5: Initialize test data factory
    const testDataFactory = TestDataFactory.getInstance();
    await testDataFactory.initialize(pool);
    
    logger.info('Test environment setup completed successfully');
    
    return {
      dbManager,
      container,
      pool,
      testDataFactory
    };
  } catch (error) {
    logger.error('Error setting up test environment:', error);
    await cleanupTestEnvironment();
    throw error;
  }
}

/**
 * Helper function to clean up database and service container after tests
 */
export async function cleanupTestEnvironment(options: { skipPoolDestruction?: boolean } = {}) {
  // Step 1: Reset test data factory
  try {
    const testDataFactory = TestDataFactory.getInstance();
    if (testDataFactory) {
      try {
        await testDataFactory.reset();
        logger.info('Test data factory reset successfully');
      } catch (error: unknown) {
        logger.warn('Error resetting test data factory:', error);
      }
    }
  } catch (error: unknown) {
    logger.warn('Error accessing test data factory:', error);
  }
  
  // Step 2: Reset service container
  try {
    ServiceContainer.resetInstance();
    logger.info('Service container reset successfully');
  } catch (error: unknown) {
    logger.warn('Error resetting service container:', error);
  }
  
  // Step 3: Clean up database
  let dbManager = null;
  try {
    dbManager = DatabaseStateManager.getInstance();
  } catch (error: unknown) {
    logger.warn('Error getting database manager instance:', error);
  }
  
  // Step 4: Clean database and shutdown if we have a reference
  if (dbManager) {
    let isInitialized = false;
    
    try {
      // Check if database is initialized
      dbManager.getPool();
      isInitialized = true;
    } catch (error: unknown) {
      logger.warn('Database not initialized, skipping database cleanup');
    }
    
    if (isInitialized) {
      try {
        await dbManager.cleanDatabase();
        logger.info('Database cleaned successfully');
      } catch (error: unknown) {
        logger.warn('Error cleaning database:', error);
      }
      
      // Skip destroying the pool if requested (for shared connection pools)
      if (!options.skipPoolDestruction) {
        try {
          await dbManager.shutdown();
          logger.info('Database manager shut down successfully');
        } catch (error: unknown) {
          logger.warn('Error shutting down database:', error);
        }
      } else {
        logger.info('Skipping database pool destruction as requested');
      }
    }
  }
  
  logger.info('Test environment cleanup completed successfully');
}

/**
 * Helper function to create a test user with unique attributes
 */
export async function createTestUser(testDataFactory: TestDataFactory, options: any = {}) {
  const timestamp = Date.now();
  const uniqueId = Math.floor(Math.random() * 10000);
  
  logger.info('Creating user in TestDataFactory...');
  
  const user = await testDataFactory.createUser({
    email: options.email || `test-${timestamp}-${uniqueId}@example.com`,
    google_id: options.google_id || `test-google-id-${timestamp}-${uniqueId}`,
    display_name: options.display_name || 'Test User',
    avatar_url: options.avatar_url || 'https://example.com/avatar.jpg',
    ...options
  });
  
  logger.info('Test user created:', { userId: user.id });
  return user;
} 