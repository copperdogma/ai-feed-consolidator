import { IDatabase } from 'pg-promise';
import { logger } from '../../server/logger';

/**
 * Base class for test fixtures that manage test data.
 * Provides methods for setting up and cleaning up test data.
 */
export class TestFixture {
  protected db: IDatabase<any>;
  protected testSuiteId: string;

  constructor(db: IDatabase<any>, testSuiteId: string) {
    this.db = db;
    this.testSuiteId = testSuiteId;
  }

  /**
   * Set up test data for this fixture
   */
  public async setup(): Promise<void> {
    try {
      await this.createTestData();
      logger.info(`Test fixture ${this.constructor.name} setup completed`);
    } catch (error) {
      logger.error(`Error setting up test fixture ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Clean up test data for this fixture
   */
  public async cleanup(): Promise<void> {
    try {
      await this.cleanupTestData();
      logger.info(`Test fixture ${this.constructor.name} cleanup completed`);
    } catch (error) {
      logger.error(`Error cleaning up test fixture ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Override this method to create test data
   */
  protected async createTestData(): Promise<void> {
    // Default implementation does nothing
    // Override in your fixture class to create specific test data
  }

  /**
   * Override this method to clean up test data
   */
  protected async cleanupTestData(): Promise<void> {
    // Default implementation does nothing
    // Override in your fixture class to clean up specific test data
  }
} 