import { IDatabase } from 'pg-promise';
import { ServiceContainer } from '../../server/services/service-container';
import { DatabaseStateManager } from './database-state-manager';
import { TestDataFactory } from './factories';
import { logger } from '../../server/logger';
import { TransactionManager } from '../../server/services/transaction-manager';
import { UserService } from '../../server/services/user-service';
import { GoogleAuthService } from '../../server/services/google-auth-service';
import { UserPreferencesService } from '../../server/services/user-preferences-service';
import { FeedRepository } from '../../server/services/rss/feed-repository';
import { RSSService } from '../../server/services/rss/rss-service';
import { FeedPollingService } from '../../server/services/feed-polling-service';
import { DatabaseCleanupService } from '../../server/services/database-cleanup-service';
import { OpenAIService } from '../../server/services/openai';
import { LoginHistoryService } from '../../server/services/login-history';
import { IServiceContainer } from '../../server/services/service-container.interface';
import { randomUUID } from 'crypto';
import { RSSFetcher } from '../../server/services/rss/rss-fetcher';
import { RSSParser } from '../../server/services/rss/rss-parser';
import { KijijiHandler } from '../../server/services/rss/kijiji-handler';
import { FeedHealthService } from '../../server/services/feed-health-service';

/**
 * Standard test setup helper that ensures consistent initialization
 * across all test files.
 */
export class TestSetupHelper {
  private static instance: TestSetupHelper | null = null;
  private dbManager: DatabaseStateManager;
  private container: ServiceContainer;
  private testDataFactory: TestDataFactory;
  private testSuiteId: string;
  private initialized = false;

  private constructor(testSuiteId: string) {
    this.testSuiteId = testSuiteId;
    this.dbManager = DatabaseStateManager.getInstance();
    this.container = ServiceContainer.getInstance();
    this.testDataFactory = TestDataFactory.getInstance();
  }

  public static getInstance(testSuiteId?: string): TestSetupHelper {
    if (!TestSetupHelper.instance) {
      if (!testSuiteId) {
        testSuiteId = randomUUID();
      }
      TestSetupHelper.instance = new TestSetupHelper(testSuiteId);
    }
    return TestSetupHelper.instance;
  }

  public static resetInstance(): void {
    if (TestSetupHelper.instance) {
      TestSetupHelper.instance.cleanup().catch(error => {
        logger.error('Error during TestSetupHelper reset:', error);
      });
    }
    TestSetupHelper.instance = null;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Step 1: Reset all singletons to ensure clean state
      await this.cleanup();

      // Step 2: Reset database manager and service container
      DatabaseStateManager.resetForTesting();
      ServiceContainer.resetInstance();
      await TestDataFactory.reset();

      // Step 3: Get fresh instances
      this.dbManager = DatabaseStateManager.getInstance();
      this.container = ServiceContainer.getInstance();
      this.testDataFactory = TestDataFactory.getInstance();

      // Step 4: Register test suite with database manager
      await this.dbManager.registerTestSuite(this.testSuiteId);

      // Step 5: Initialize database manager if not already initialized
      if (!this.dbManager.isReady()) {
        await this.dbManager.initialize();
      }

      // Step 6: Get database pool and verify it's ready
      const pool = this.dbManager.getPool();
      if (!pool) {
        throw new Error('Database pool not initialized after manager initialization');
      }

      // Step 7: Register pool with BOTH names for backward compatibility
      this.container.register('pool', pool);
      this.container.register('databasePool', pool);

      // Step 8: Register transaction manager first
      TransactionManager.resetInstance();
      const transactionManager = TransactionManager.getInstance(this.container);
      this.container.register('transactionManager', transactionManager);

      // Step 9: Initialize test data factory early
      await this.testDataFactory.initialize(pool);

      // Step 10: Initialize container AFTER pool and transaction manager are registered
      await this.container.initialize();

      // Step 11: Register all required services
      // Core services first
      const feedRepository = new FeedRepository(this.container);
      this.container.register('feedRepository', feedRepository);

      // RSS-related services
      const rssFetcher = new RSSFetcher({
        userAgent: 'AI Feed Consolidator Test/1.0',
        fallbackUserAgent: 'Mozilla/5.0',
        timeoutMs: 5000
      });
      this.container.register('rssFetcher', rssFetcher);

      const rssParser = new RSSParser();
      this.container.register('rssParser', rssParser);

      const kijijiHandler = new KijijiHandler();
      this.container.register('kijijiHandler', kijijiHandler);

      const feedHealthService = new FeedHealthService(this.container);
      this.container.register('feedHealthService', feedHealthService);

      const rssService = new RSSService(this.container);
      this.container.register('rssService', rssService);

      // Additional services
      const feedPollingService = new FeedPollingService(this.container);
      this.container.register('feedPollingService', feedPollingService);

      const databaseCleanupService = new DatabaseCleanupService(this.container);
      this.container.register('databaseCleanupService', databaseCleanupService);

      // Step 12: Initialize and register singleton services
      // User-related services
      UserService.initialize(this.container);
      const userService = UserService.getInstance(this.container);
      this.container.register('userService', userService);

      UserPreferencesService.initialize(this.container);
      const userPreferencesService = UserPreferencesService.getInstance(this.container);
      this.container.register('userPreferencesService', userPreferencesService);

      // Authentication services
      GoogleAuthService.initialize(this.container);
      const googleAuthService = GoogleAuthService.getInstance(this.container);
      this.container.register('googleAuthService', googleAuthService);

      LoginHistoryService.initialize(this.container);
      const loginHistoryService = LoginHistoryService.getInstance(this.container);
      this.container.register('loginHistoryService', loginHistoryService);

      // External services
      OpenAIService.initialize(this.container);
      const openaiService = OpenAIService.getInstance(this.container);
      this.container.register('openaiService', openaiService);

      // Step 13: Verify all required services are registered
      const requiredServices = [
        'pool', 'transactionManager', 'feedRepository', 'rssFetcher', 'rssParser',
        'kijijiHandler', 'feedHealthService', 'rssService', 'feedPollingService',
        'databaseCleanupService', 'userService', 'userPreferencesService',
        'googleAuthService', 'loginHistoryService', 'openaiService'
      ];

      for (const service of requiredServices) {
        if (!this.container.hasService(service)) {
          throw new Error(`Required service ${service} not registered`);
        }
      }

      this.initialized = true;
      logger.info('Test setup completed successfully');
    } catch (error) {
      logger.error('Failed to initialize test setup:', error);
      await this.cleanup();
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Step 1: Clean database state if initialized
      if (this.dbManager?.isReady()) {
        await this.dbManager.cleanDatabase();
      }

      // Step 2: Clear service container
      if (this.container) {
        await this.container.clear();
      }

      // Step 3: Reset test data factory
      if (this.testDataFactory) {
        await this.testDataFactory.reset();
      }

      // Step 4: Unregister test suite
      if (this.dbManager) {
        await this.dbManager.unregisterTestSuite(this.testSuiteId);
      }

      // Step 5: Reset all singletons
      await TestDataFactory.reset();
      ServiceContainer.resetInstance();
      DatabaseStateManager.resetForTesting();

      this.initialized = false;
      logger.info('Test cleanup completed successfully');
    } catch (error) {
      logger.error('Error during test cleanup:', error);
      throw error;
    }
  }

  public getContainer(): ServiceContainer {
    if (!this.initialized) {
      throw new Error('TestSetupHelper not initialized');
    }
    return this.container;
  }

  public getDbManager(): DatabaseStateManager {
    return this.dbManager;
  }

  public getTestDataFactory(): TestDataFactory {
    if (!this.initialized) {
      throw new Error('TestSetupHelper not initialized');
    }
    return this.testDataFactory;
  }

  public getPool(): IDatabase<any> {
    if (!this.initialized) {
      throw new Error('TestSetupHelper not initialized');
    }
    return this.dbManager.getPool();
  }
}

/**
 * Helper function to create a test setup instance with a unique test suite ID
 * @deprecated Use TestSetupHelper.getInstance() instead
 */
export function createTestSetup(): TestSetupHelper {
  return TestSetupHelper.getInstance();
} 