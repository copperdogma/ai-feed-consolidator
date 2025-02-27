import { beforeEach, afterEach } from 'vitest';
import { ServiceContainer } from '../../server/services/service-container';
import { logger } from '../../server/logger';

/**
 * Base class for unit tests that don't require database access.
 * Provides a clean ServiceContainer instance for each test.
 */
export class UnitTestBase {
  protected container: ServiceContainer;

  constructor() {
    this.container = ServiceContainer.getInstance();
  }

  protected async setup() {
    try {
      // Reset container for clean state
      ServiceContainer.resetInstance();
      this.container = ServiceContainer.getInstance();
      
      // Register mock services
      await this.registerMocks();
      
      logger.info('Unit test setup completed successfully');
    } catch (error) {
      logger.error('Error in unit test setup:', error);
      throw error;
    }
  }

  protected async cleanup() {
    try {
      // Reset container
      ServiceContainer.resetInstance();
      logger.info('Unit test cleanup completed successfully');
    } catch (error) {
      logger.error('Error in unit test cleanup:', error);
    }
  }

  /**
   * Override this method to register mock services for your tests
   */
  protected async registerMocks(): Promise<void> {
    // Default implementation does nothing
    // Override in your test class to register specific mocks
  }
}

// Global test hooks
beforeEach(async () => {
  // Reset all singletons before each test
  ServiceContainer.resetInstance();
});

afterEach(async () => {
  // Clean up after each test
  ServiceContainer.resetInstance();
}); 