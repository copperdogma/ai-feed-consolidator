import { DatabaseStateManager } from './database-state-manager';
import { ServiceContainer } from '../../server/services/service-container';
import { randomUUID } from 'crypto';
import pino from 'pino';
import { TransactionManager } from '../../server/services/transaction-manager';
import { UserService } from '../../server/services/user-service';
import { GoogleAuthService } from '../../server/services/google-auth-service';
import { LoginHistoryService } from '../../server/services/login-history';
import { OpenAIService } from '../../server/services/openai';
import { UserPreferencesService } from '../../server/services/user-preferences-service';
import { FeedHealthService } from '../../server/services/feed-health';
import { FeedItemService } from '../../server/services/feed-item';
import { FeedPollingService } from '../../server/services/rss/feed-polling-service';
import { OPMLService } from '../../server/services/opml';
import { DatabaseCleanupService } from '../../server/services/database-cleanup-service';
import { FeedConfigService } from '../../server/services/feed-config';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: true,
});

export class GlobalTestSetup {
  private static instance: GlobalTestSetup;
  private dbManager: DatabaseStateManager;
  private container: ServiceContainer;
  private testSuiteId: string;
  private initialized = false;
  private cleanupInProgress = false;

  private constructor() {
    this.testSuiteId = randomUUID();
    this.dbManager = DatabaseStateManager.getInstance();
    this.container = ServiceContainer.getInstance();
  }

  public static getInstance(): GlobalTestSetup {
    if (!GlobalTestSetup.instance) {
      GlobalTestSetup.instance = new GlobalTestSetup();
    }
    return GlobalTestSetup.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Step 1: Initialize database manager if needed
      if (!this.dbManager.isReady()) {
        await this.dbManager.initialize();
      }

      // Step 2: Register test suite with database manager
      await this.dbManager.registerTestSuite(this.testSuiteId);

      // Step 3: Register pool first (must be done before container initialization)
      this.container.register('pool', this.dbManager.getPool());

      // Step 4: Initialize service container
      await this.container.initialize();

      // Step 5: Register core services
      this.registerCoreServices();

      this.initialized = true;
      logger.info('Test setup initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize test setup:', error);
      await this.cleanup();
      throw error;
    }
  }

  private registerCoreServices(): void {
    // Register core service factories
    this.container.registerFactory('transactionManager', (c) => TransactionManager.getInstance(c));
    this.container.registerFactory('userService', (c) => new UserService(c));
    this.container.registerFactory('googleAuthService', (c) => new GoogleAuthService(c));
    this.container.registerFactory('loginHistoryService', (c) => new LoginHistoryService(c));
    this.container.registerFactory('openaiService', (c) => new OpenAIService(c));
    this.container.registerFactory('userPreferencesService', (c) => new UserPreferencesService(c));
    this.container.registerFactory('feedHealthService', (c) => new FeedHealthService(c));
    this.container.registerFactory('feedItemService', (c) => new FeedItemService(c));
    this.container.registerFactory('feedPollingService', (c) => new FeedPollingService(c));
    this.container.registerFactory('opmlService', (c) => new OPMLService(c));
    this.container.registerFactory('databaseCleanupService', (c) => new DatabaseCleanupService(c));
    this.container.registerFactory('feedConfigService', (c) => new FeedConfigService(c));

    logger.info('Core services registered successfully');
  }

  public async cleanup(): Promise<void> {
    if (this.cleanupInProgress) {
      return;
    }

    this.cleanupInProgress = true;
    try {
      // Step 1: Clear service container
      await this.container.clear();

      // Step 2: Clean database
      if (this.dbManager.isReady()) {
        await this.dbManager.cleanDatabase();
      }

      // Step 3: Unregister test suite
      await this.dbManager.unregisterTestSuite(this.testSuiteId);

      // Step 4: Reset state
      this.initialized = false;
      logger.info('Test setup cleaned up successfully');
    } catch (error) {
      logger.error('Error during test setup cleanup:', error);
      throw error;
    } finally {
      this.cleanupInProgress = false;
    }
  }

  public getServiceContainer(): ServiceContainer {
    if (!this.initialized) {
      throw new Error('Test setup not initialized');
    }
    return this.container;
  }

  public getDatabaseManager(): DatabaseStateManager {
    if (!this.initialized) {
      throw new Error('Test setup not initialized');
    }
    return this.dbManager;
  }

  public async cleanDatabase(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Test setup not initialized');
    }
    await this.dbManager.cleanDatabase();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const globalTestSetup = GlobalTestSetup.getInstance(); 