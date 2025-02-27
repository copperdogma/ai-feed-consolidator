import { dbManager } from '../../tests/utils/test-hooks';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createUser, getUserById, getUserByGoogleId, updateUser } from '../services/db';
import { logger } from '../logger';

// Generate a unique test suite ID
const testSuiteId = `user-test-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

beforeAll(async () => {
  try {
    // Ensure database manager is initialized
    await dbManager.initialize();
    
    // Register this test suite with the database manager
    await dbManager.registerTestSuite(testSuiteId);
    
    logger.info('User test setup completed successfully');
  } catch (error) {
    logger.error('Error in user test setup:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Unregister this test suite from the database manager
    await dbManager.unregisterTestSuite(testSuiteId);
    
    logger.info('User test cleanup completed successfully');
  } catch (error) {
    logger.error('Error in user test cleanup:', error);
  }
});

beforeEach(async () => {
  await dbManager.cleanDatabase();
});

describe('User Database Functions', () => {
  const testUser = {
    google_id: 'test-google-id-123',
    email: 'test@example.com',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg'
  };

  it('should create a user successfully', async () => {
    const user = await createUser(testUser);
    
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.google_id).toBe(testUser.google_id);
    expect(user.email).toBe(testUser.email);
    expect(user.display_name).toBe(testUser.display_name);
    expect(user.avatar_url).toBe(testUser.avatar_url);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should retrieve a user by Google ID', async () => {
    // Create a user first
    const createdUser = await createUser(testUser);
    
    // Try to retrieve by Google ID
    const retrievedUser = await getUserByGoogleId(testUser.google_id);
    
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.id).toBe(createdUser.id);
    expect(retrievedUser?.google_id).toBe(testUser.google_id);
  });

  it('should retrieve a user by ID', async () => {
    // Create a user first
    const createdUser = await createUser(testUser);
    
    // Try to retrieve by ID
    const retrievedUser = await getUserById(createdUser.id);
    
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.id).toBe(createdUser.id);
    expect(retrievedUser?.google_id).toBe(testUser.google_id);
  });

  it('should update a user successfully', async () => {
    // Create a user first
    const createdUser = await createUser(testUser);
    
    // Update the user
    const updatedUserData = {
      display_name: 'Updated Name',
      avatar_url: 'https://example.com/new-avatar.jpg'
    };
    
    const updatedUser = await updateUser(createdUser.id, updatedUserData);
    
    expect(updatedUser).toBeDefined();
    expect(updatedUser?.id).toBe(createdUser.id);
    expect(updatedUser?.display_name).toBe(updatedUserData.display_name);
    expect(updatedUser?.avatar_url).toBe(updatedUserData.avatar_url);
    expect(updatedUser?.email).toBe(testUser.email); // Should be unchanged
    expect(updatedUser?.google_id).toBe(testUser.google_id); // Should be unchanged
  });

  it('should handle non-existent users gracefully', async () => {
    const nonExistentUser = await getUserById(9999);
    expect(nonExistentUser).toBeNull();
    
    const nonExistentGoogleUser = await getUserByGoogleId('non-existent-google-id');
    expect(nonExistentGoogleUser).toBeNull();
  });
}); 