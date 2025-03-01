import { beforeEach, afterEach } from 'vitest';
import { ServiceContainer } from '../../server/services/service-container';
import { DatabaseStateManager } from './setup-test-db';
import { TestDataFactory } from './factories';
import { logger } from '../../server/logger';
import { registerStandardServices, ServiceRegistrationType } from './register-standard-services';
import crypto from 'crypto';

/**
 * Base class for integration tests that require database access.
 * Provides a clean database and ServiceContainer instance for each test.
 */
export class IntegrationTestBase {
  protected container: ServiceContainer = ServiceContainer.getInstance();
  protected dbManager: DatabaseStateManager = DatabaseStateManager.getInstance();
  protected testDataFactory: TestDataFactory = TestDataFactory.getInstance();
  protected testSuiteId: string;
  protected serviceType: ServiceRegistrationType = ServiceRegistrationType.CORE;

  constructor(serviceType: ServiceRegistrationType = ServiceRegistrationType.CORE) {
    this.testSuiteId = crypto.randomUUID();
    this.serviceType = serviceType;
  }

  public async setup() {
    try {
      logger.info('Starting integration test setup');
      
      // Get existing instances (don't shut down the global one)
      this.dbManager = DatabaseStateManager.getInstance();
      
      // Make sure DB is initialized
      try {
        logger.info('Ensuring database is initialized');
        await this.dbManager.initialize();
        logger.info('Database is initialized');
      } catch (err) {
        logger.error('Error initializing database:', err);
        throw err;
      }
      
      // Get database pool
      let pool;
      try {
        logger.info('Getting database pool');
        pool = this.dbManager.getPool();
        logger.info('Successfully got database pool');
      } catch (err) {
        logger.error('Error getting database pool:', err);
        throw err;
      }
      
      if (!pool) {
        throw new Error('Database pool not initialized after manager initialization');
      }
      
      // Reset and initialize service container
      logger.info('Setting up service container');
      ServiceContainer.resetInstance();
      this.container = ServiceContainer.getInstance();
      this.container.register('pool', pool);
      this.container.register('databasePool', pool);
      
      // Initialize container
      logger.info('Initializing container');
      await this.container.initialize();
      
      // Register standard services
      logger.info('Registering standard services');
      await registerStandardServices(
        this.container,
        pool,
        this.serviceType,
        { verbose: true }
      );

      // Initialize test data factory
      logger.info('Initializing test data factory');
      this.testDataFactory = TestDataFactory.getInstance();
      await this.testDataFactory.initialize(pool);

      // Clean the database initially
      await this.dbManager.cleanDatabase();

      logger.info('Integration test setup completed successfully');
    } catch (error) {
      logger.error('Error in integration test setup:', error);
      throw error;
    }
  }

  public async cleanup() {
    try {
      logger.info('Starting integration test cleanup');
      
      // Only clear the container, don't shut down database
      if (this.container) {
        await this.container.clear();
      }
      
      // Reset test data factory, but don't destroy connections
      if (this.testDataFactory) {
        this.testDataFactory.reset();
      }
      
      logger.info('Integration test cleanup completed successfully');
    } catch (error) {
      logger.error('Error in integration test cleanup:', error);
    }
  }
}

// Remove global test hooks as they're not needed - each test class will handle its own setup/cleanup 