import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db, User, UserPreferences } from '../db';
import { config } from '../../config';

describe('Database Service', () => {
  let testUser: User;

  // Helper to clean up test data
  const cleanup = async () => {
    await db.pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  };

  beforeAll(async () => {
    // Ensure we're using test database
    expect(config.databaseUrl).toContain('test');
  });

  beforeEach(cleanup);
  afterAll(cleanup);

  describe('User Operations', () => {
    it('should create a new user with preferences', async () => {
      const userData = {
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const user = await db.createUser(userData);
      expect(user).toBeDefined();
      expect(user.google_id).toBe(userData.google_id);
      expect(user.email).toBe(userData.email);

      // Check preferences were created
      const prefs = await db.getUserPreferences(user.id);
      expect(prefs).toBeDefined();
      expect(prefs?.theme).toBe('light'); // default value
    });

    it('should find user by Google ID', async () => {
      const userData = {
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
      };

      await db.createUser(userData);
      const found = await db.getUserByGoogleId(userData.google_id);
      expect(found).toBeDefined();
      expect(found?.email).toBe(userData.email);
    });

    it('should update user data', async () => {
      const userData = {
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
      };

      const user = await db.createUser(userData);
      const updated = await db.updateUser(user.id, {
        display_name: 'Updated Name',
      });

      expect(updated).toBeDefined();
      expect(updated?.display_name).toBe('Updated Name');
      expect(updated?.email).toBe(userData.email); // unchanged
    });
  });

  describe('User Preferences', () => {
    it('should get user preferences', async () => {
      const userData = {
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
      };

      const user = await db.createUser(userData);
      const prefs = await db.getUserPreferences(user.id);
      
      expect(prefs).toBeDefined();
      expect(prefs?.theme).toBe('light');
      expect(prefs?.email_notifications).toBe(true);
      expect(prefs?.summary_level).toBe(1);
    });

    it('should update user preferences', async () => {
      const userData = {
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
      };

      const user = await db.createUser(userData);
      const updated = await db.updateUserPreferences(user.id, {
        theme: 'dark',
        summary_level: 2,
      });

      expect(updated).toBeDefined();
      expect(updated?.theme).toBe('dark');
      expect(updated?.summary_level).toBe(2);
      expect(updated?.email_notifications).toBe(true); // unchanged
    });
  });
}); 