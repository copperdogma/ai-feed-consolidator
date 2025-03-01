import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { UserService } from '../user-service';
import { ServiceContainer } from '../service-container';
import { DatabaseStateManager } from '../../../tests/utils/database-state-manager';
import type { User } from '../../../types/user';
import { TestDataFactory } from '../../../tests/utils/test-data-factory';
import { logger } from '../../logger';
import { registerStandardServices, ServiceRegistrationType } from '../../../tests/utils/register-standard-services';

// Run tests in sequence, not in parallel
describe.sequential('UserService', () => {
  let service: UserService;
  let container: ServiceContainer;
  let dbManager: DatabaseStateManager;
  let testDataFactory: TestDataFactory;
  let pool: any;

  // Set up once before all tests
  beforeAll(async () => {
    try {
      logger.info('Starting UserService test setup');
      
      // Get existing instances (don't shut down the global one)
      dbManager = DatabaseStateManager.getInstance();
      
      // Make sure DB is initialized
      try {
        logger.info('Ensuring database is initialized');
        await dbManager.initialize();
        logger.info('Database is initialized');
      } catch (err) {
        logger.error('Error initializing database:', err);
        throw err;
      }
      
      // Get database pool
      try {
        logger.info('Getting database pool');
        pool = dbManager.getPool();
        logger.info('Successfully got database pool');
      } catch (err) {
        logger.error('Error getting database pool:', err);
        throw err;
      }
      
      // Reset and initialize service container
      logger.info('Setting up service container');
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      container.register('pool', pool);
      container.register('databasePool', pool);
      
      // Initialize container
      logger.info('Initializing container');
      await container.initialize();
      
      // Register standard services
      logger.info('Registering standard services');
      await registerStandardServices(container, pool, ServiceRegistrationType.USER, {
        verbose: true
      });
      
      // Get user service
      service = container.getService<UserService>('userService');
      
      // Initialize test data factory
      logger.info('Initializing test data factory');
      testDataFactory = TestDataFactory.getInstance();
      await testDataFactory.initialize(pool);
      
      logger.info('UserService test setup completed successfully');
    } catch (error) {
      logger.error('Error in UserService test setup:', error);
      throw error;
    }
  });

  // Clean up once after all tests
  afterAll(async () => {
    try {
      logger.info('Starting UserService test cleanup');
      
      // Only clear the container, don't shut down database
      await container.clear();
      
      logger.info('UserService test cleanup completed successfully');
    } catch (error) {
      logger.error('Error in UserService test cleanup:', error);
    }
  });

  // Before each individual test
  beforeEach(async () => {
    try {
      logger.info('UserService test beforeEach - cleaning database');
      await dbManager.cleanDatabase();
      logger.info('UserService test beforeEach completed');
    } catch (error) {
      logger.error('Error in UserService test beforeEach:', error);
      throw error;
    }
  });

  describe('findById', () => {
    it('should find a user by ID', async () => {
      logger.info('Starting test: find user by ID');
      
      const testUser = await testDataFactory.createUser({
        google_id: 'test-google-id',
        email: 'test@example.com'
      });
      
      const foundUser = await service.findById(testUser.id);
      expect(foundUser).toBeTruthy();
      expect(foundUser?.id).toBe(testUser.id);
      expect(foundUser?.email).toBe(testUser.email);
      
      logger.info('Test completed: find user by ID');
    });

    it('should return null for non-existent user', async () => {
      logger.info('Starting test: return null for non-existent user');
      
      const result = await service.findById(999999);
      expect(result).toBeNull();
      
      logger.info('Test completed: return null for non-existent user');
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      logger.info('Starting test: update user fields');
      
      const testUser = await testDataFactory.createUser({
        google_id: 'test-google-id-update',
        email: 'test-update@example.com',
        display_name: 'Original Name'
      });
      
      const updates = {
        display_name: 'Updated Name',
        email: 'updated@example.com'
      };

      const updatedUser = await service.update(testUser.id, updates);
      if (!updatedUser) {
        throw new Error('Failed to update user');
      }
      expect(updatedUser.display_name).toBe(updates.display_name);
      expect(updatedUser.email).toBe(updates.email);
      
      logger.info('Test completed: update user fields');
    });

    it('should ignore invalid update fields', async () => {
      logger.info('Starting test: ignore invalid update fields');
      
      const testUser = await testDataFactory.createUser({
        google_id: 'test-google-id-invalid',
        email: 'test-invalid@example.com',
        display_name: 'Original Name'
      });
      
      const updates = {
        invalid_field: 'should be ignored',
        display_name: 'Valid Update'
      } as Partial<User>;

      const updatedUser = await service.update(testUser.id, updates);
      if (!updatedUser) {
        throw new Error('Failed to update user');
      }
      expect(updatedUser.display_name).toBe('Valid Update');
      expect((updatedUser as any).invalid_field).toBeUndefined();
      
      logger.info('Test completed: ignore invalid update fields');
    });
  });

  describe('deleteUser', () => {
    it('should delete user and related data', async () => {
      logger.info('Starting test: delete user and related data');
      
      const testUser = await testDataFactory.createUser({
        google_id: 'test-google-id-delete',
        email: 'test-delete@example.com'
      });
      
      const result = await service.deleteUser(testUser.id);
      expect(result).toBe(true);

      const deletedUser = await service.findById(testUser.id);
      expect(deletedUser).toBeNull();
      
      logger.info('Test completed: delete user and related data');
    });

    it('should return false if user not found', async () => {
      logger.info('Starting test: return false if user not found for deletion');
      
      const result = await service.deleteUser(999999);
      expect(result).toBe(false);
      
      logger.info('Test completed: return false if user not found for deletion');
    });
  });

  describe('validateUser', () => {
    it('should validate a valid user', async () => {
      logger.info('Starting test: validate a valid user');
      
      const testUser = await testDataFactory.createUser({
        google_id: 'test-google-id-validate',
        email: 'test-validate@example.com'
      });
      
      const result = await service.validateUser(testUser.id);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      logger.info('Test completed: validate a valid user');
    });

    it('should return errors for invalid user', async () => {
      logger.info('Starting test: return errors for invalid user');
      
      const testUser = await testDataFactory.createUser({
        google_id: 'test-google-id-invalid-validate',
        email: 'test-invalid-validate@example.com'
      });
      
      // Delete the user to make it invalid
      await service.deleteUser(testUser.id);

      const result = await service.validateUser(testUser.id);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/user not found/i);
      
      logger.info('Test completed: return errors for invalid user');
    });
  });

  describe('Singleton Management', () => {
    it('should initialize and return the same instance', () => {
      logger.info('Starting test: initialize and return same instance');
      
      const instance1 = UserService.getInstance(container);
      const instance2 = UserService.getInstance(container);
      expect(instance2).toStrictEqual(instance1);
      
      logger.info('Test completed: initialize and return same instance');
    });

    it('should throw if getting instance before initialization', () => {
      logger.info('Starting test: throw if getting instance before initialization');
      
      expect(() => new UserService(null as any)).toThrow();
      
      logger.info('Test completed: throw if getting instance before initialization');
    });

    it('should initialize if container provided to getUserService', () => {
      logger.info('Starting test: initialize if container provided');
      
      const userService = new UserService(container);
      expect(userService).toBeTruthy();
      
      logger.info('Test completed: initialize if container provided');
    });
  });
}); 