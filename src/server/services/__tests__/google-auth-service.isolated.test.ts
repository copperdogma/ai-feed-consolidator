import { describe, expect, it, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { GoogleAuthService } from '../google-auth-service';
import { Pool } from 'pg';
import { IDatabase } from 'pg-promise';
import type { Profile } from 'passport-google-oauth20';
import type { ServiceContainer } from '../service-container';
import type { UserService } from '../user-service';
import type { User } from '../../../types/user';
import { DatabaseStateManager } from '../../../tests/utils/setup-test-db';
import { TransactionManager } from '../transaction-manager';
import { ServiceRegistrationType, registerStandardServices } from '../../../tests/utils/register-standard-services';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../tests/utils/test-setup-helpers';
import { TestDataFactory } from '../../../tests/utils/factories';
import { logger } from '../../logger';
import { initializeServiceContainer } from '../service-container';
import { randomUUID } from 'crypto';

// Set longer timeout for all tests in this file
vi.setConfig({ testTimeout: 120000 });

describe('GoogleAuthService', () => {
  const mockProfile: Profile = {
    id: '123456789',
    displayName: 'Test User',
    emails: [{ value: 'test@example.com', verified: true }],
    photos: [{ value: 'https://example.com/photo.jpg' }],
    provider: 'google',
    _raw: '',
    _json: {
      iss: 'https://accounts.google.com',
      aud: 'test-client-id',
      sub: '123456789',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    profileUrl: 'https://example.com/profile'
  };

  let container: ServiceContainer;
  let googleAuthService: GoogleAuthService;
  let transactionManager: TransactionManager;
  let factory: TestDataFactory;
  let pool: IDatabase<any>;
  let dbManager: DatabaseStateManager;
  
  // Create a unique testSuiteId for this test file
  const testSuiteId = `google-auth-test-${randomUUID()}`;

  beforeAll(async () => {
    try {
      logger.info('[SETUP] Starting test setup');
      // Initialize the database and register the test suite
      dbManager = DatabaseStateManager.getInstance();
      await dbManager.registerTestSuite(testSuiteId);
      logger.info('[SETUP] Database initialized and test suite registered');
    } catch (error) {
      logger.error('[SETUP] Error in test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      logger.info('[CLEANUP] Starting test cleanup');
      // Release the connection and unregister the test suite
      await dbManager.releaseConnection(testSuiteId);
      await dbManager.unregisterTestSuite(testSuiteId);
      logger.info('[CLEANUP] Database connection released and test suite unregistered');
    } catch (error) {
      logger.error('[CLEANUP] Error in test cleanup:', error);
    }
  });

  beforeEach(async () => {
    try {
      // Acquire a connection for this test suite
      pool = await dbManager.acquireConnection(testSuiteId);
      
      if (!pool) {
        throw new Error('Failed to acquire database connection');
      }

      // Set up the test environment with the existing pool
      const env = await setupTestEnvironment({ providedPool: pool });
      container = env.container;
      
      // Register services
      await registerStandardServices(container, pool, ServiceRegistrationType.USER);
      
      // Initialize Google Auth Service
      GoogleAuthService.resetForTesting();
      GoogleAuthService.initialize(container);
      googleAuthService = GoogleAuthService.getInstance(container);
      
      // Get transaction manager
      transactionManager = container.getService<TransactionManager>('transactionManager');
      
      // Reset test data factory and get instance
      if (factory) {
        await factory.reset();
      } else {
        factory = TestDataFactory.getInstance();
      }
      await factory.initialize(pool);
      
      logger.info('GoogleAuthService test setup completed successfully');
    } catch (error) {
      logger.error('Error in beforeEach:', error);
      throw error;
    }
  });
  
  afterEach(async () => {
    try {
      // First try to reset the factory connection to ensure proper cleanup
      if (factory) {
        try {
          // Check if resetConnection exists, otherwise use reset
          if (typeof factory.resetConnection === 'function') {
            await factory.resetConnection();
          } else {
            await factory.reset();
          }
        } catch (error) {
          logger.warn('Error resetting TestDataFactory connection:', error);
        }
      }
      
      // Clean up the test environment but don't close the pool
      await cleanupTestEnvironment({ skipPoolDestruction: true });
      logger.info('GoogleAuthService test cleanup completed successfully');
    } catch (error) {
      logger.error('Error in afterEach:', error);
    }
  });

  describe('findOrCreateGoogleUser', () => {
    it('should return existing user', async () => {
      const user = await factory.createUser({
        google_id: mockProfile.id,
        email: mockProfile.emails![0].value,
        display_name: mockProfile.displayName,
        avatar_url: mockProfile.photos![0].value
      });

      const result = await googleAuthService.findOrCreateGoogleUser(mockProfile);
      expect(result).toBeDefined();
      expect(result.google_id).toBe(mockProfile.id);
      expect(result.email).toBe(mockProfile.emails![0].value);
    });

    it('should create new user if not exists', async () => {
      const result = await googleAuthService.findOrCreateGoogleUser(mockProfile);
      expect(result).toBeDefined();
      expect(result.google_id).toBe(mockProfile.id);
      expect(result.email).toBe(mockProfile.emails![0].value);
    });
  });

  describe('updateGoogleProfile', () => {
    it('should update user profile', async () => {
      const user = await factory.createUser({
        google_id: mockProfile.id,
        email: mockProfile.emails![0].value,
        display_name: mockProfile.displayName,
        avatar_url: mockProfile.photos![0].value
      });

      const updatedProfile = {
        ...mockProfile,
        displayName: 'Updated User',
        photos: [{ value: 'https://example.com/new-photo.jpg' }]
      };

      const updatedUser = await googleAuthService.updateGoogleProfile(user.id, updatedProfile);
      expect(updatedUser.display_name).toBe('Updated User');
      expect(updatedUser.avatar_url).toBe('https://example.com/new-photo.jpg');
    });

    it('should throw error if user not found', async () => {
      await expect(googleAuthService.updateGoogleProfile(999, mockProfile))
        .rejects.toThrow('User not found: 999');
    });
  });

  describe('linkGoogleAccount', () => {
    it('should link Google account to user', async () => {
      const user = await factory.createUser({
        email: 'test@example.com',
        google_id: undefined
      });

      const result = await googleAuthService.linkGoogleAccount(user.id, mockProfile);
      expect(result).toBe(true);

      // Query the database directly to check the updated user
      const updatedUser = await transactionManager.withReadTransaction(async (client) => {
        const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
        return rows[0];
      });
      expect(updatedUser.google_id).toBe(mockProfile.id);
    });

    it('should throw error if Google account already linked', async () => {
      // Create first user with Google account
      await factory.createUser({
        google_id: mockProfile.id,
        email: 'first@example.com'
      });

      // Create second user without Google account
      const secondUser = await factory.createUser({
        email: 'second@example.com',
        google_id: undefined
      });

      await expect(googleAuthService.linkGoogleAccount(secondUser.id, mockProfile))
        .rejects.toThrow('Google account already linked to another user');
    });
  });

  describe('unlinkGoogleAccount', () => {
    it('should unlink Google account', async () => {
      const user = await factory.createUser({
        google_id: mockProfile.id,
        email: mockProfile.emails![0].value
      });

      const result = await googleAuthService.unlinkGoogleAccount(user.id);
      expect(result).toBe(true);

      // Query the database directly to check the updated user
      const updatedUser = await transactionManager.withReadTransaction(async (client) => {
        const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
        return rows[0];
      });
      expect(updatedUser.google_id).toBeNull();
    });

    it('should throw error if Google account not linked', async () => {
      const user = await factory.createUser({
        google_id: undefined,
        email: 'test@example.com'
      });

      await expect(googleAuthService.unlinkGoogleAccount(user.id))
        .rejects.toThrow('Google account not linked');
    });
  });

  describe('Singleton Management', () => {
    beforeEach(() => {
      vi.resetModules();
      GoogleAuthService.resetForTesting();
    });

    it('should initialize and return the same instance', async () => {
      const instance1 = GoogleAuthService.getInstance(container);
      const instance2 = GoogleAuthService.getInstance(container);
      expect(instance1).toBe(instance2);
    });

    it('should throw if getting instance before initialization', () => {
      GoogleAuthService.resetForTesting();
      expect(() => GoogleAuthService.getInstance(null as any)).toThrow('GoogleAuthService not initialized');
    });
  });
}); 