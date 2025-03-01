import { ServiceContainer } from '../../server/services/service-container';
import { TransactionManager } from '../../server/services/transaction-manager';
import * as dbService from '../../server/services/db';
import { UserService } from '../../server/services/user-service';
import { UserPreferencesService } from '../../server/services/user-preferences-service';
import { LoginHistoryService } from '../../server/services/login-history';
import { GoogleAuthService } from '../../server/services/google-auth-service';
import { FeedConfigService } from '../../server/services/feed-config-service';
import { RSSService } from '../../server/services/rss/rss-service';
import { RSSFetcher } from '../../server/services/rss/rss-fetcher';
import { RSSParser } from '../../server/services/rss/rss-parser';
import { FeedRepository } from '../../server/services/rss/feed-repository';
import { KijijiHandler } from '../../server/services/rss/kijiji-handler';
import { ContentProcessor } from '../../server/services/content-processor';
import { OpenAIService } from '../../server/services/openai';
import { FeedHealthService } from '../../server/services/feed-health-service';
import { logger } from '../../server/logger';
import { IDatabase } from 'pg-promise';

/**
 * Types of service registration
 */
export enum ServiceRegistrationType {
  /** Register only the database pool */
  POOL_ONLY = 'pool-only',
  /** Register core services (pool, transaction manager, database service) */
  CORE = 'core',
  /** Register user-related services (core + user, preferences, login history) */
  USER = 'user',
  /** Register auth-related services (user + google auth) */
  AUTH = 'auth',
  /** Register feed-related services (user + feed config, RSS) */
  FEED = 'feed',
  /** Register RSS-specific services (feed + RSS handlers) */
  RSS = 'rss',
  /** Register content processing services (RSS + content processor, OpenAI) */
  CONTENT = 'content',
  /** Register all available services */
  ALL = 'all'
}

/**
 * Registers standard services in the correct dependency order.
 * This ensures consistent service registration across all tests.
 * 
 * @param container The service container to register services in
 * @param pool The database pool to register
 * @param type The type of services to register (defaults to CORE)
 * @param options Additional options for service registration
 * @returns The updated service container
 */
export async function registerStandardServices(
  container: ServiceContainer,
  pool: IDatabase<any>,
  type: ServiceRegistrationType = ServiceRegistrationType.CORE,
  options: {
    /** Skip initialization after registration */
    skipInitialization?: boolean;
    /** Skip registration of specific services */
    skipServices?: string[];
    /** Mock implementations for specific services */
    mockServices?: Record<string, any>;
    /** Enable detailed logging */
    verbose?: boolean;
  } = {}
): Promise<ServiceContainer> {
  const log = (message: string) => {
    if (options.verbose) {
      logger.info(`[ServiceRegistration] ${message}`);
    }
  };

  const skipServices = options.skipServices || [];
  const mockServices = options.mockServices || {};

  // Step 1: Always register the pool first
  log('Registering database pool');
  container.register('databasePool', pool);
  container.register('pool', pool);

  // Skip further registration if POOL_ONLY type
  if (type === ServiceRegistrationType.POOL_ONLY) {
    log('Pool-only registration completed');
    if (!options.skipInitialization) {
      await container.initialize();
    }
    return container;
  }

  // Step 2: Register TransactionManager (always needed)
  if (!skipServices.includes('transactionManager')) {
    log('Registering TransactionManager');
    if (mockServices.transactionManager) {
      container.register('transactionManager', mockServices.transactionManager);
    } else {
      const transactionManager = TransactionManager.getInstance(container);
      container.register('transactionManager', transactionManager);
    }
  }

  // Step 3: Register DatabaseService (always needed for data access)
  if (!skipServices.includes('databaseService')) {
    log('Registering DatabaseService');
    if (mockServices.databaseService) {
      container.register('databaseService', mockServices.databaseService);
    } else {
      // For dbService, we use the module's functions directly
      container.register('databaseService', dbService);
    }
  }

  // Stop here if only core services are needed
  if (type === ServiceRegistrationType.CORE) {
    log('Core services registration completed');
    if (!options.skipInitialization) {
      await container.initialize();
    }
    return container;
  }

  // Step 4: Register user-related services
  if (type === ServiceRegistrationType.USER || 
      type === ServiceRegistrationType.AUTH || 
      type === ServiceRegistrationType.FEED || 
      type === ServiceRegistrationType.RSS || 
      type === ServiceRegistrationType.CONTENT || 
      type === ServiceRegistrationType.ALL) {
    
    log('Registering user-related services');
    
    if (!skipServices.includes('userService')) {
      log('Registering UserService');
      if (mockServices.userService) {
        container.register('userService', mockServices.userService);
      } else {
        container.registerFactory('userService', (c) => new UserService(c));
      }
    }

    if (!skipServices.includes('userPreferencesService')) {
      log('Registering UserPreferencesService');
      if (mockServices.userPreferencesService) {
        container.register('userPreferencesService', mockServices.userPreferencesService);
      } else {
        container.registerFactory('userPreferencesService', (c) => new UserPreferencesService(c));
      }
    }

    if (!skipServices.includes('loginHistoryService')) {
      log('Registering LoginHistoryService');
      if (mockServices.loginHistoryService) {
        container.register('loginHistoryService', mockServices.loginHistoryService);
      } else {
        container.registerFactory('loginHistoryService', (c) => new LoginHistoryService(c));
      }
    }
  }

  // Step 5: Register auth-related services
  if (type === ServiceRegistrationType.AUTH || 
      type === ServiceRegistrationType.ALL) {
    
    log('Registering auth-related services');
    
    if (!skipServices.includes('googleAuthService')) {
      log('Registering GoogleAuthService');
      if (mockServices.googleAuthService) {
        container.register('googleAuthService', mockServices.googleAuthService);
      } else {
        container.registerFactory('googleAuthService', (c) => new GoogleAuthService(c));
      }
    }
  }

  // Step 6: Register feed-related services
  if (type === ServiceRegistrationType.FEED || 
      type === ServiceRegistrationType.RSS || 
      type === ServiceRegistrationType.CONTENT || 
      type === ServiceRegistrationType.ALL) {
    
    log('Registering feed-related services');
    
    if (!skipServices.includes('feedConfigService')) {
      log('Registering FeedConfigService');
      if (mockServices.feedConfigService) {
        container.register('feedConfigService', mockServices.feedConfigService);
      } else {
        container.registerFactory('feedConfigService', (c) => new FeedConfigService(c));
      }
    }

    if (!skipServices.includes('feedHealthService')) {
      log('Registering FeedHealthService');
      if (mockServices.feedHealthService) {
        container.register('feedHealthService', mockServices.feedHealthService);
      } else {
        container.registerFactory('feedHealthService', (c) => new FeedHealthService(c));
      }
    }
  }

  // Step 7: Register RSS-specific services
  if (type === ServiceRegistrationType.RSS || 
      type === ServiceRegistrationType.CONTENT || 
      type === ServiceRegistrationType.ALL) {
    
    log('Registering RSS-specific services');
    
    // Register RSS fetcher, parser, and repository
    if (!skipServices.includes('rssFetcher')) {
      log('Registering RSSFetcher');
      if (mockServices.rssFetcher) {
        container.register('rssFetcher', mockServices.rssFetcher);
      } else {
        container.registerFactory('rssFetcher', () => new RSSFetcher());
      }
    }

    if (!skipServices.includes('rssParser')) {
      log('Registering RSSParser');
      if (mockServices.rssParser) {
        container.register('rssParser', mockServices.rssParser);
      } else {
        container.registerFactory('rssParser', () => new RSSParser());
      }
    }

    if (!skipServices.includes('feedRepository')) {
      log('Registering FeedRepository');
      if (mockServices.feedRepository) {
        container.register('feedRepository', mockServices.feedRepository);
      } else {
        container.registerFactory('feedRepository', (c) => new FeedRepository(c));
      }
    }

    // Register Kijiji handler
    if (!skipServices.includes('kijijiHandler')) {
      log('Registering KijijiHandler');
      if (mockServices.kijijiHandler) {
        container.register('kijijiHandler', mockServices.kijijiHandler);
      } else {
        container.registerFactory('kijijiHandler', () => new KijijiHandler());
      }
    }

    // Register RSS service itself (depends on handlers)
    if (!skipServices.includes('rssService')) {
      log('Registering RSSService');
      if (mockServices.rssService) {
        container.register('rssService', mockServices.rssService);
      } else {
        container.registerFactory('rssService', (c) => new RSSService(c));
      }
    }
  }

  // Step 8: Register content processing services
  if (type === ServiceRegistrationType.CONTENT || 
      type === ServiceRegistrationType.ALL) {
    
    log('Registering content processing services');
    
    // Register OpenAI service
    if (!skipServices.includes('openaiService')) {
      log('Registering OpenAIService');
      if (mockServices.openaiService) {
        container.register('openaiService', mockServices.openaiService);
      } else {
        try {
          // Initialize and register the OpenAI service
          log('Initializing OpenAIService');
          OpenAIService.resetForTesting(); // Reset to ensure a clean instance
          OpenAIService.initialize(container);
          
          const openaiService = OpenAIService.getInstance(container);
          container.register('openaiService', openaiService);
          log('OpenAIService registered successfully');
        } catch (error) {
          // Don't fail the entire registration process if OpenAI fails to initialize
          log(`Error registering OpenAIService: ${error instanceof Error ? error.message : String(error)}`);
          
          // Still register a mock service to prevent downstream errors
          container.register('openaiService', {
            createSummary: async () => {
              throw new Error('Mock OpenAIService not properly initialized');
            }
          });
        }
      }
    }
    
    // Register content processor service
    if (!skipServices.includes('contentProcessorService')) {
      log('Registering ContentProcessorService');
      if (mockServices.contentProcessorService) {
        container.register('contentProcessorService', mockServices.contentProcessorService);
      } else {
        container.registerFactory('contentProcessorService', (c) => {
          const openaiService = c.getService<OpenAIService>('openaiService');
          return new ContentProcessor(openaiService);
        });
      }
    }
  }

  // Finally, initialize the container if not skipped
  if (!options.skipInitialization) {
    log('Initializing service container');
    await container.initialize();
  }

  log(`Service registration completed (type: ${type})`);
  return container;
} 