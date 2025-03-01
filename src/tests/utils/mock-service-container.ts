import { Pool } from 'pg';
import { IServiceContainer } from '../../server/services/service-container.interface';
import { ServiceContainer } from '../../server/services/service-container';
import { TransactionManager } from '../../server/services/transaction-manager';
import { RSSFetcher } from '../../server/services/rss/rss-fetcher';
import { RSSParser } from '../../server/services/rss/rss-parser';
import { FeedRepository } from '../../server/services/rss/feed-repository';
import { UserService } from '../../server/services/user-service';
import { GoogleAuthService } from '../../server/services/google-auth-service';
import { LoginHistoryService } from '../../server/services/login-history';
import { OpenAIService } from '../../server/services/openai';
import { RSSService } from '../../server/services/rss/rss-service';

/**
 * A mock implementation of IServiceContainer for testing.
 */
export class MockServiceContainer implements IServiceContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, (container: IServiceContainer) => any>();
  private pool: Pool | null = null;
  private _isInitialized = false;
  private static instance: MockServiceContainer | null = null;

  private constructor() {}

  public static getInstance(): MockServiceContainer {
    if (!MockServiceContainer.instance) {
      MockServiceContainer.instance = new MockServiceContainer();
    }
    return MockServiceContainer.instance;
  }

  public static resetInstance(): void {
    if (MockServiceContainer.instance) {
      MockServiceContainer.instance.reset();
      MockServiceContainer.instance = null;
    }
  }

  initialize(pool: Pool): void {
    if (this._isInitialized) {
      return;
    }

    this.pool = pool;
    this.registerServices();
    this._isInitialized = true;
  }

  private registerServices(): void {
    // Register core services
    this.registerFactory('pool', () => this.pool);

    // Register TransactionManager with the container
    this.registerFactory('transactionManager', () => {
      TransactionManager.resetInstance();
      return TransactionManager.getInstance(this);
    });

    // Register RSS-related services with test-specific configuration
    this.registerFactory('rssFetcher', () => new RSSFetcher({
      userAgent: 'AI Feed Consolidator Test/1.0',
      fallbackUserAgent: 'Mozilla/5.0 (Test)',
      timeoutMs: 5000
    }));
    this.registerFactory('rssParser', () => new RSSParser());
    this.registerFactory('rssService', (container) => new RSSService(container));

    // Register services that require ServiceContainer
    this.registerFactory('feedRepository', () => new FeedRepository(this));
    this.registerFactory('userService', () => UserService.getInstance(this));
    this.registerFactory('googleAuthService', () => GoogleAuthService.getInstance(this));
    this.registerFactory('loginHistoryService', () => LoginHistoryService.getInstance(this));
    this.registerFactory('openAIService', () => OpenAIService.getInstance(this));
  }

  registerService<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  getService<T>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service '${name}' not registered`);
    }

    const service = factory(this);
    this.services.set(name, service);
    return service;
  }

  hasService(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  registerFactory<T>(name: string, factory: (container: IServiceContainer) => T): void {
    this.factories.set(name, factory);
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.pool = null;
    this._isInitialized = false;
    TransactionManager.resetInstance();
  }

  reset(): void {
    this.clear();
  }
}

/**
 * Creates a new instance of MockServiceContainer and initializes it with the given pool.
 */
export function createMockServiceContainer(pool: Pool): MockServiceContainer {
  const container = MockServiceContainer.getInstance();
  container.initialize(pool);
  return container;
}

/**
 * Creates a new instance of ServiceContainer and initializes it with the given pool.
 * This is useful for tests that need a real service container.
 */
export function getDummyServiceContainer(pool: Pool): ServiceContainer {
  ServiceContainer.resetInstance();
  const container = ServiceContainer.getInstance();
  container.initialize(pool);
  return container;
}