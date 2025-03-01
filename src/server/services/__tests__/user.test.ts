import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Profile } from 'passport-google-oauth20';
import type { User } from '../../../types/user';
import { GoogleAuthService } from '../google-auth-service';
import { ServiceContainer } from '../service-container';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../tests/utils/test-setup-helpers';
import { logger } from '../../logger';
import { registerStandardServices, ServiceRegistrationType } from '../../../tests/utils/register-standard-services';
import { UserService } from '../user-service';
import { IDatabase } from 'pg-promise';
import { TransactionManager } from '../transaction-manager';

describe('UserService', () => {
  let googleAuthService: GoogleAuthService;
  let userService: UserService;
  let container: ServiceContainer;
  let testProfile: Profile;
  let pool: IDatabase<any>;
  
  // Setup before each test
  beforeEach(async () => {
    try {
      // Step 1: Set up the test environment - this gives us a clean database and container
      const env = await setupTestEnvironment();
      pool = env.pool;
      
      // Step 2: Create a fresh service container
      // We need to explicitly reset to ensure no state leaks between tests
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      
      // Step 3: Register core services (pool and transaction manager) first
      container.register('pool', pool);
      const transactionManager = TransactionManager.getInstance(container);
      container.register('transactionManager', transactionManager);
      
      // Step 4: Initialize the container (critical step before registering factories)
      await container.initialize();
      
      // Step 5: Now register all other services using the helper
      await registerStandardServices(
        container, 
        pool, 
        ServiceRegistrationType.AUTH,
        {
          // Skip initialization as we've already initialized
          skipInitialization: true,
          verbose: true
        }
      );
      
      // Step 6: Get service instances
      googleAuthService = container.getService<GoogleAuthService>('googleAuthService');
      userService = container.getService<UserService>('userService');
      
      // Step 7: Setup test profile with a unique identifier
      const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      testProfile = {
        id: `google-${uniqueId}`,
        displayName: 'Test User',
        emails: [{ value: `test-${uniqueId}@example.com` }],
        photos: [{ value: 'https://example.com/avatar.jpg' }],
        provider: 'google',
        _raw: '',
        _json: {}
      } as Profile;
      
      logger.info('UserService test setup completed successfully');
    } catch (error) {
      logger.error('Error in UserService test setup:', error);
      throw error;
    }
  });

  // Cleanup after each test
  afterEach(async () => {
    try {
      // Try to reset the service container first, before doing database operations
      try {
        ServiceContainer.resetInstance();
        logger.info('Service container reset successfully');
      } catch (err) {
        logger.warn('Error resetting service container:', err);
      }
      
      // Try to clean up the test environment, but don't throw if it fails
      try {
        await cleanupTestEnvironment();
        logger.info('Test environment cleanup completed successfully');
      } catch (err) {
        logger.warn('Error during test environment cleanup:', err);
      }
      
      logger.info('UserService test cleanup completed');
    } catch (error) {
      logger.error('Error in test cleanup:', error);
      // We don't rethrow here to allow tests to continue even if cleanup fails
    }
  });

  it('should create a new Google user when none exists', async () => {
    const user = await googleAuthService.findOrCreateGoogleUser(testProfile);
    expect(user).toBeDefined();
    expect(user.email).toBe(testProfile.emails?.[0].value);
    expect(user.display_name).toBe(testProfile.displayName);
    expect(user.avatar_url).toBe(testProfile.photos?.[0].value);
    expect(user.google_id).toBe(testProfile.id);
  });

  it('should return existing user when found by Google ID', async () => {
    // First create a user
    const user1 = await googleAuthService.findOrCreateGoogleUser(testProfile);
    
    // Try to create again with same profile
    const user2 = await googleAuthService.findOrCreateGoogleUser(testProfile);
    
    expect(user2.id).toBe(user1.id);
    expect(user2.google_id).toBe(testProfile.id);
  });

  it('should update existing user when found by email', async () => {
    // Create a new profile with the same email but different Google ID
    const email = testProfile.emails?.[0].value;
    const initialProfile = {
      ...testProfile,
      id: `different-${Date.now()}-${Math.floor(Math.random() * 10000)}` // Different Google ID
    };
    
    const user1 = await googleAuthService.findOrCreateGoogleUser(initialProfile);
    expect(user1.google_id).toBe(initialProfile.id);
    
    // Now try to create a user with the original profile (different Google ID, same email)
    const user2 = await googleAuthService.findOrCreateGoogleUser(testProfile);
    
    // Should update the existing user
    expect(user2.id).toBe(user1.id);
    expect(user2.google_id).toBe(testProfile.id);
    expect(user2.email).toBe(email);
  });
}); 