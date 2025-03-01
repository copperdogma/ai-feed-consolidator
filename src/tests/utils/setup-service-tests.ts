import { Pool } from 'pg';
import { ServiceContainer } from '../../server/services/service-container';
import { IServiceContainer } from '../../server/services/service-container.interface';
import { TransactionManager } from '../../server/services/transaction-manager';
import { DatabaseStateManager } from './database-state-manager';
import { TestDataFactory } from './test-data-factory';
import { UserService } from '../../server/services/user-service';
import { GoogleAuthService } from '../../server/services/google-auth-service';
import { UserPreferencesService } from '../../server/services/user-preferences-service';
import { RSSService } from '../../server/services/rss-service';
import { FeedRepository } from '../../server/repositories/feed-repository';
import { FeedPollingService } from '../../server/services/feed-polling-service';
import { DatabaseCleanupService } from '../../server/services/database-cleanup-service';
import { logger } from '../../server/logger';

export async function initializeTestServices(): Promise<ServiceContainer> {
  try {
    // Initialize database manager
    const dbManager = DatabaseStateManager.getInstance();
    await dbManager.initialize();
    const pool = dbManager.getPool();

    // Initialize test data factory
    TestDataFactory.resetInstance();
    await TestDataFactory.initialize(pool);

    // Initialize service container
    ServiceContainer.resetInstance();
    const container = ServiceContainer.getInstance();

    // Register pool first
    container.register('pool', pool);

    // Initialize container
    await container.initialize();

    // Register core services in dependency order
    container.registerFactory('transactionManager', (c: IServiceContainer) => TransactionManager.getInstance(c));
    container.registerFactory('userService', (c: IServiceContainer) => new UserService(c));
    container.registerFactory('googleAuthService', (c: IServiceContainer) => new GoogleAuthService(c));
    container.registerFactory('userPreferencesService', (c: IServiceContainer) => new UserPreferencesService(c));
    container.registerFactory('feedRepository', (c: IServiceContainer) => new FeedRepository(c));
    container.registerFactory('rssService', (c: IServiceContainer) => new RSSService(c));
    container.registerFactory('feedPollingService', (c: IServiceContainer) => new FeedPollingService(c));
    container.registerFactory('databaseCleanupService', (c: IServiceContainer) => new DatabaseCleanupService(c));

    return container;
  } catch (error) {
    logger.error('Failed to initialize test services:', error);
    throw error;
  }
}

export async function cleanupTestServices(): Promise<void> {
  try {
    const dbManager = DatabaseStateManager.getInstance();
    await dbManager.cleanDatabase();
    ServiceContainer.resetInstance();
    TestDataFactory.resetInstance();
  } catch (error) {
    logger.error('Failed to cleanup test services:', error);
    throw error;
  }
}

export async function shutdownTestServices(): Promise<void> {
  try {
    const dbManager = DatabaseStateManager.getInstance();
    await dbManager.shutdown();
    ServiceContainer.resetInstance();
    TestDataFactory.resetInstance();
  } catch (error) {
    logger.error('Failed to shutdown test services:', error);
    throw error;
  }
}

// Helper function to get a clean database connection for tests
export async function getTestPool(): Promise<Pool> {
  return DatabaseStateManager.getInstance().getPool();
}

// Export commonly used test utilities
export {
  ServiceContainer,
  TransactionManager,
  DatabaseStateManager,
  TestDataFactory
}; 