import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ServiceContainer } from '../../services/service-container';
import { registerStandardServices, ServiceRegistrationType } from '../../../tests/utils/register-standard-services';
import { logger } from '../../logger';
import { TestDataFactory } from '../../../tests/utils/factories';
import { dbManager } from '../../../tests/utils/test-hooks';
import { randomUUID } from 'crypto';

describe('Database Service', () => {
  let container: ServiceContainer;
  let testDataFactory: TestDataFactory;
  const testSuiteId = `db-test-${randomUUID()}`;

  beforeEach(async () => {
    try {
      // Ensure database is initialized
      await dbManager.initialize();
      const pool = dbManager.getPool();
      
      // Get a fresh container instance
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      container.register('pool', pool);
      container.register('databasePool', pool);
      
      // Register services using the standardized helper
      await registerStandardServices(
        container,
        pool,
        ServiceRegistrationType.CORE,
        { verbose: true }
      );
      
      // Initialize test data factory
      testDataFactory = TestDataFactory.getInstance();
      await testDataFactory.initialize(pool);
      
      // Clean database before test
      await dbManager.cleanDatabase();
      
      logger.info('Database Service test setup completed successfully');
    } catch (error) {
      logger.error('Failed to initialize Database Service test:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      // Clean up database
      await dbManager.cleanDatabase();
      
      // Clean up service container
      if (container) {
        await container.clear();
      }
      
      // Reset test data factory
      TestDataFactory.getInstance().reset();
      
      logger.info('Database Service test cleanup completed successfully');
    } catch (error) {
      logger.error('Error during Database Service test cleanup:', error);
      throw error;
    }
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const user = await testDataFactory.createUser({
        email: 'test@example.com',
        display_name: 'Test User'
      });

      expect(user.email).toBe('test@example.com');
      expect(user.display_name).toBe('Test User');
    });

    it('should find a user by Google ID', async () => {
      const user = await testDataFactory.createUser({
        email: 'find@example.com',
        google_id: 'test-google-id',
        display_name: 'Find User'
      });

      const result = await dbManager.getPool().one(
        'SELECT * FROM users WHERE google_id = $1',
        [user.google_id]
      );

      expect(result.id).toBe(user.id);
      expect(result.email).toBe('find@example.com');
    });

    it('should update user data', async () => {
      const user = await testDataFactory.createUser({
        email: 'update@example.com',
        display_name: 'Original Name'
      });

      const result = await dbManager.getPool().one(
        'UPDATE users SET display_name = $1 WHERE id = $2 RETURNING *',
        ['Updated Name', user.id]
      );

      expect(result.display_name).toBe('Updated Name');
    });

    it('should handle concurrent user updates', async () => {
      const user = await testDataFactory.createUser({
        email: 'concurrent@example.com',
        display_name: 'Original Name'
      });

      // Simulate concurrent updates
      const updates = [
        dbManager.getPool().one('UPDATE users SET display_name = $1 WHERE id = $2 RETURNING *', ['Name 1', user.id]),
        dbManager.getPool().one('UPDATE users SET display_name = $1 WHERE id = $2 RETURNING *', ['Name 2', user.id])
      ];

      const [result] = await Promise.all(updates);
      expect(['Name 1', 'Name 2']).toContain(result.display_name);
    });
  });

  describe('User Preferences', () => {
    it('should get user preferences', async () => {
      const user = await testDataFactory.createUser({
        email: 'prefs@example.com'
      });

      const prefsResult = await dbManager.getPool().one(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [user.id]
      );

      expect(prefsResult.theme).toBe('light');
      expect(prefsResult.email_notifications).toBe(true);
      expect(prefsResult.content_language).toBe('en');
    });

    it('should update user preferences', async () => {
      const user = await testDataFactory.createUser({
        email: 'prefs-update@example.com'
      });

      const updatedResult = await dbManager.getPool().one(
        'UPDATE user_preferences SET theme = $1, email_notifications = $2 WHERE user_id = $3 RETURNING *',
        ['dark', false, user.id]
      );

      expect(updatedResult.theme).toBe('dark');
      expect(updatedResult.email_notifications).toBe(false);
    });

    it('should handle concurrent preference updates', async () => {
      const user = await testDataFactory.createUser({
        email: 'prefs-concurrent@example.com'
      });

      // Simulate concurrent updates
      const updates = [
        dbManager.getPool().one('UPDATE user_preferences SET theme = $1 WHERE user_id = $2 RETURNING *', ['dark', user.id]),
        dbManager.getPool().one('UPDATE user_preferences SET theme = $1 WHERE user_id = $2 RETURNING *', ['light', user.id])
      ];

      const [result] = await Promise.all(updates);
      expect(['dark', 'light']).toContain(result.theme);
    });
  });
}); 