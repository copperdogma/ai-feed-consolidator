import { UserPreferencesService, getUserPreferencesService } from '../user-preferences-service';
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { TransactionManager } from '../transaction-manager';
import type { UserPreferences } from '../../../types/user';
import { logger } from '../../logger';
import { DatabaseStateManager } from '../../../tests/utils/database-state-manager';
import { ServiceContainer } from '../service-container';
import { registerStandardServices, ServiceRegistrationType } from '../../../tests/utils/register-standard-services';
import { vi } from 'vitest';
import { resetUserPreferencesService } from '../user-preferences-service';

describe('UserPreferencesService', () => {
  let preferencesService: UserPreferencesService;
  let mockPreferences: Partial<UserPreferences>;
  let container: ServiceContainer;
  let dbManager: DatabaseStateManager;
  let transactionManager: TransactionManager;
  let pool: any;

  beforeAll(async () => {
    try {
      // Reset singletons to ensure clean state
      DatabaseStateManager.getInstance().shutdown();
      ServiceContainer.resetInstance();
      TransactionManager.resetInstance();
      
      // Initialize database
      dbManager = DatabaseStateManager.getInstance();
      await dbManager.initialize();
      pool = dbManager.getPool();
      
      // Setup the container with core services
      container = ServiceContainer.getInstance();
      container.register('pool', pool);
      container.register('databasePool', pool);
      
      // Initialize the container
      await container.initialize();
      
      // Initialize transaction manager
      transactionManager = TransactionManager.getInstance(container);
      container.register('transactionManager', transactionManager);
      
      // Register user-related services
      await registerStandardServices(container, pool, ServiceRegistrationType.USER);
      
      // Get the preferences service
      preferencesService = container.getService<UserPreferencesService>('userPreferencesService');
      
      logger.info('UserPreferencesService test setup completed');
    } catch (error) {
      logger.error('Error in UserPreferencesService test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Cleanup in reverse order
      await container.clear();
      await dbManager.shutdown();
      ServiceContainer.resetInstance();
      TransactionManager.resetInstance();
      resetUserPreferencesService();
      
      logger.info('UserPreferencesService test cleanup completed');
    } catch (error) {
      logger.error('Error in UserPreferencesService test cleanup:', error);
    }
  });

  beforeEach(async () => {
    try {
      // Clean database before each test
      await dbManager.cleanDatabase();
      
      // Setup mock data for tests
      mockPreferences = {
        user_id: 1,
        theme: 'light' as const,
        email_notifications: true,
        content_language: 'en',
        summary_level: 1
      };
      
      logger.info('UserPreferencesService test beforeEach completed');
    } catch (error) {
      logger.error('Error in UserPreferencesService test beforeEach:', error);
      throw error;
    }
  });

  describe('Get User Preferences', () => {
    it('should get user preferences', async () => {
      // Insert test user
      await pool.query(`
        INSERT INTO users (id, email, display_name, google_id, created_at, updated_at)
        VALUES (1, 'test@example.com', 'Test User', 'google123', NOW(), NOW())
      `);
      
      // Insert test preferences
      await pool.query(`
        INSERT INTO user_preferences (
          user_id, theme, email_notifications, content_language,
          summary_level, created_at, updated_at
        )
        VALUES (
          1, 'dark', true, 'en', 2, NOW(), NOW()
        )
      `);
      
      const preferences = await preferencesService.getPreferences(1);
      expect(preferences).toBeDefined();
      expect(preferences.theme).toBe('dark');
      expect(preferences.summary_level).toBe(2);
    });

    it('should return default preferences if none exist', async () => {
      // Insert test user without preferences
      await pool.query(`
        INSERT INTO users (id, email, display_name, google_id, created_at, updated_at)
        VALUES (1, 'test@example.com', 'Test User', 'google123', NOW(), NOW())
      `);
      
      const preferences = await preferencesService.getPreferences(1);
      expect(preferences).toBeDefined();
      expect(preferences.theme).toBe('light'); // default theme
      expect(preferences.email_notifications).toBe(true); // default value
    });
  });

  describe('Update User Preferences', () => {
    it('should update existing preferences', async () => {
      // Insert test user
      await pool.query(`
        INSERT INTO users (id, email, display_name, google_id, created_at, updated_at)
        VALUES (1, 'test@example.com', 'Test User', 'google123', NOW(), NOW())
      `);
      
      // Insert initial preferences
      await pool.query(`
        INSERT INTO user_preferences (
          user_id, theme, email_notifications, content_language,
          summary_level, created_at, updated_at
        )
        VALUES (
          1, 'light', true, 'en', 1, NOW(), NOW()
        )
      `);
      
      const updatedPrefs = {
        theme: 'dark' as const,
        email_notifications: false,
        content_language: 'fr',
        summary_level: 2
      };
      
      await preferencesService.updatePreferences(1, updatedPrefs);
      
      const preferences = await preferencesService.getPreferences(1);
      expect(preferences.theme).toBe('dark');
      expect(preferences.email_notifications).toBe(false);
      expect(preferences.content_language).toBe('fr');
      expect(preferences.summary_level).toBe(2);
    });

    it('should create preferences if none exist', async () => {
      // Insert test user without preferences
      await pool.query(`
        INSERT INTO users (id, email, display_name, google_id, created_at, updated_at)
        VALUES (1, 'test@example.com', 'Test User', 'google123', NOW(), NOW())
      `);
      
      const newPrefs = {
        theme: 'dark' as const,
        email_notifications: false
      };
      
      await preferencesService.updatePreferences(1, newPrefs);
      
      const preferences = await preferencesService.getPreferences(1);
      expect(preferences.theme).toBe('dark');
      expect(preferences.email_notifications).toBe(false);
      expect(preferences.content_language).toBe('en'); // default value
    });

    it('should handle partial updates', async () => {
      // Insert test user
      await pool.query(`
        INSERT INTO users (id, email, display_name, google_id, created_at, updated_at)
        VALUES (1, 'test@example.com', 'Test User', 'google123', NOW(), NOW())
      `);
      
      // Insert initial preferences
      await pool.query(`
        INSERT INTO user_preferences (
          user_id, theme, email_notifications, content_language,
          summary_level, created_at, updated_at
        )
        VALUES (
          1, 'light', true, 'en', 1, NOW(), NOW()
        )
      `);
      
      const partialUpdate = {
        theme: 'dark' as const
      };
      
      await preferencesService.updatePreferences(1, partialUpdate);
      
      const preferences = await preferencesService.getPreferences(1);
      expect(preferences.theme).toBe('dark');
      expect(preferences.email_notifications).toBe(true); // unchanged
      expect(preferences.content_language).toBe('en'); // unchanged
      expect(preferences.summary_level).toBe(1); // unchanged
    });
  });

  describe('Validate Preferences', () => {
    it('should validate correct preferences', async () => {
      const validPreferences = {
        theme: 'dark' as const,
        email_notifications: false,
        content_language: 'fr',
        summary_level: 2
      };

      const result = await preferencesService.validatePreferences(validPreferences);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid preferences', async () => {
      const invalidPreferences = {
        theme: 'invalid-theme',
        email_notifications: 'not-a-boolean',
        content_language: 'invalid',
        summary_level: 0
      } as any;

      const result = await preferencesService.validatePreferences(invalidPreferences);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Singleton Management', () => {
    it('should initialize and return the same instance', () => {
      // Reset first
      resetUserPreferencesService();
      
      // Now initialize with container
      const container = ServiceContainer.getInstance();
      container.register('transactionManager', transactionManager);
      
      const instance1 = UserPreferencesService.getInstance(container);
      const instance2 = UserPreferencesService.getInstance(container);
      expect(instance2).toBe(instance1);
    });
    
    it('should throw if getting instance before initialization', () => {
      resetUserPreferencesService();
      expect(() => UserPreferencesService.getInstance()).toThrow();
    });
    
    it('should initialize if container provided to getUserPreferencesService', () => {
      // Reset first
      resetUserPreferencesService();
      
      // Initialize through factory function
      const container = ServiceContainer.getInstance();
      container.register('transactionManager', transactionManager);
      
      const service = getUserPreferencesService(container);
      expect(service).toBeTruthy();
    });
  });
}); 