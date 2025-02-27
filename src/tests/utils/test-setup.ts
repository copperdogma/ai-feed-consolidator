import { expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { dbManager } from './setup-test-db';
import { logger } from '../../server/logger';
import { setupMockServer, resetMockServer, cleanupMockServer } from './mock-server';
import { ServiceContainer } from '../../server/services/service-container';
import { IServiceContainer } from '../../server/services/service-container.interface';
import { DatabaseStateManager } from './setup-test-db';
import { TestDataFactory } from './test-data-factory';
import { UserService } from '../../server/services/user-service';
import { GoogleAuthService } from '../../server/services/google-auth-service';
import { RSSService } from '../../server/services/rss/rss-service';
import { LoginHistoryService } from '../../server/services/login-history';
import { OpenAIService } from '../../server/services/openai';
import { UserPreferencesService } from '../../server/services/user-preferences-service';
import { FeedHealthService } from '../../server/services/feed-health';
import { FeedItemService } from '../../server/services/feed-item';
import { FeedPollingService } from '../../server/services/rss/feed-polling-service';
import { OPMLService } from '../../server/services/opml';
import { DatabaseCleanupService } from '../../server/services/database-cleanup-service';
import { RSSFetcher } from '../../server/services/rss/rss-fetcher';
import { RSSParser } from '../../server/services/rss/rss-parser';
import { TransactionManager } from '../../server/services/transaction-manager';
import { FeedRepository } from '../../server/services/rss/feed-repository';
import { DatabaseStateManager } from './database-state-manager';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

// Extend Vitest's expect with Testing Library's matchers
expect.extend(matchers);

// Disable logger during tests
logger.level = 'silent';

// Mock browser APIs
const mockWindow = {
  location: {
    href: 'http://localhost:3003',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  navigator: {
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn(),
    },
    userAgent: 'test',
  },
  fetch: vi.fn(),
  alert: vi.fn(),
  confirm: vi.fn(),
  prompt: vi.fn(),
};

// Set up global mocks
vi.stubGlobal('window', mockWindow);
vi.stubGlobal('localStorage', mockWindow.localStorage);
vi.stubGlobal('sessionStorage', mockWindow.sessionStorage);
vi.stubGlobal('navigator', mockWindow.navigator);
vi.stubGlobal('fetch', mockWindow.fetch);
vi.stubGlobal('alert', mockWindow.alert);
vi.stubGlobal('confirm', mockWindow.confirm);
vi.stubGlobal('prompt', mockWindow.prompt);

const TEST_SUITE_ID = 'global-test-suite';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: true,
});

export class TestSetup {
  private static instance: TestSetup;
  private dbManager: DatabaseStateManager;
  private container: ServiceContainer;
  private testSuiteId: string;
  private initialized = false;
  private cleanupInProgress = false;

  private constructor() {
    this.testSuiteId = uuidv4();
    this.dbManager = DatabaseStateManager.getInstance();
    this.container = ServiceContainer.getInstance();
  }

  public static getInstance(): TestSetup {
    if (!TestSetup.instance) {
      TestSetup.instance = new TestSetup();
    }
    return TestSetup.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Step 1: Register test suite with database manager
      await this.dbManager.registerTestSuite(this.testSuiteId);

      // Step 2: Initialize database manager if needed
      if (!this.dbManager.isReady()) {
        await this.dbManager.initialize();
      }

      // Step 3: Initialize service container with pool from database manager
      if (!this.container.isInitialized()) {
        await this.container.initialize(this.dbManager.getPool());
      }

      this.initialized = true;
      logger.info('Test setup initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize test setup:', error);
      await this.cleanup();
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    if (this.cleanupInProgress) {
      return;
    }

    this.cleanupInProgress = true;
    try {
      // Step 1: Clear service container
      if (this.container.isInitialized()) {
        await this.container.clear();
      }

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

// Initialize test environment
beforeAll(async () => {
  try {
    // Register this test suite
    dbManager.registerTestSuite(TEST_SUITE_ID);

    // Initialize database with retries
    let retries = 0;
    const maxRetries = 3;
    let lastError;

    while (retries < maxRetries) {
      try {
        await dbManager.initialize();
        break;
      } catch (error) {
        lastError = error;
        retries++;
        logger.error(`Failed to initialize database (attempt ${retries}/${maxRetries}):`, error);
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (retries === maxRetries) {
      logger.error('Max retries reached, failing test initialization');
      throw lastError;
    }

    // Initialize test data factory
    TestDataFactory.resetInstance();
    await TestDataFactory.initialize(dbManager.getPool());
    
    // Clean database state
    await dbManager.cleanDatabase();
    
    // Initialize service container
    ServiceContainer.resetInstance();
    const container = ServiceContainer.getInstance();
    container.initialize(dbManager.getPool());
    
    // Register core services in dependency order
    container.registerFactory('pool', () => dbManager.getPool());
    container.registerFactory('transactionManager', (c: IServiceContainer) => TransactionManager.getInstance(c));
    container.registerFactory('userService', (c: IServiceContainer) => new UserService(c));
    container.registerFactory('googleAuthService', (c: IServiceContainer) => new GoogleAuthService(c));
    container.registerFactory('loginHistoryService', (c: IServiceContainer) => new LoginHistoryService(c));
    container.registerFactory('openaiService', (c: IServiceContainer) => new OpenAIService(c));
    container.registerFactory('userPreferencesService', (c: IServiceContainer) => new UserPreferencesService(c));
    container.registerFactory('feedHealthService', (c: IServiceContainer) => new FeedHealthService(c));
    container.registerFactory('feedItemService', (c: IServiceContainer) => new FeedItemService(c));
  } catch (error) {
    logger.error('Error in test setup:', error);
    throw error;
  }
});

// Clean up database between tests
beforeEach(async () => {
  try {
    await dbManager.cleanDatabase();
  } catch (error) {
    logger.error('Error cleaning database between tests:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await dbManager.cleanDatabase();
    dbManager.unregisterTestSuite(TEST_SUITE_ID);
    // Don't end the pool here - let the DatabaseStateManager handle it
  } catch (error) {
    logger.error('Error in test cleanup:', error);
    throw error;
  }
});

// Set up before each test
beforeEach(async () => {
  try {
    // Clean database first
    await dbManager.cleanDatabase();

    // Reset service container and reinitialize with fresh pool
    ServiceContainer.resetInstance();
    const container = ServiceContainer.getInstance();
    container.initialize(dbManager.getPool());
    
    // Initialize test data factory
    TestDataFactory.resetInstance();
    await TestDataFactory.initialize(dbManager.getPool());
    
    // Register core services in dependency order
    container.registerFactory('pool', () => dbManager.getPool());
    container.registerFactory('transactionManager', (c: IServiceContainer) => TransactionManager.getInstance(c));
    container.registerFactory('rssFetcher', () => new RSSFetcher({
      userAgent: 'AI Feed Consolidator Test/1.0',
      fallbackUserAgent: 'Mozilla/5.0 (compatible; RSSFeedReader/1.0; +https://example.com/bot)',
      timeoutMs: 5000
    }));
    container.registerFactory('rssParser', () => new RSSParser());
    container.registerFactory('feedRepository', (c: IServiceContainer) => new FeedRepository(c));
    container.registerFactory('rssService', (c: IServiceContainer) => new RSSService(c));
    container.registerFactory('userService', (c: IServiceContainer) => new UserService(c));
    container.registerFactory('googleAuthService', (c: IServiceContainer) => new GoogleAuthService(c));
    container.registerFactory('loginHistoryService', (c: IServiceContainer) => new LoginHistoryService(c));
    container.registerFactory('openaiService', (c: IServiceContainer) => new OpenAIService(c));
    container.registerFactory('userPreferencesService', (c: IServiceContainer) => new UserPreferencesService(c));
    container.registerFactory('feedHealthService', (c: IServiceContainer) => new FeedHealthService(c));
    container.registerFactory('feedItemService', (c: IServiceContainer) => new FeedItemService(c));
    container.registerFactory('feedPollingService', (c: IServiceContainer) => new FeedPollingService(c));
    container.registerFactory('opmlService', (c: IServiceContainer) => new OPMLService(c));
    container.registerFactory('databaseCleanupService', (c: IServiceContainer) => new DatabaseCleanupService(c));

    // Set up fake timers
    vi.useFakeTimers();
    
    // Reset mock handlers
    resetMockServer();
    
    // Reset all mocks
    vi.clearAllMocks();
  } catch (error) {
    logger.error('Failed to set up test:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    await dbManager.cleanDatabase();
    ServiceContainer.resetInstance();
    TestDataFactory.resetInstance();
  } catch (error) {
    logger.error('Failed to clean database after test:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await cleanupMockServer();
    // Only close connections if this is the last test suite
    if (dbManager.getActiveTestSuites().size === 0) {
      await dbManager.closeConnections();
    }
  } catch (error) {
    logger.error('Failed to clean up test environment:', error);
    throw error;
  }
});

// Add any additional test setup here 