import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { db, createTestUser } from '../../__tests__/setup';
import { UserService } from '../user';
import type { Profile } from 'passport-google-oauth20';

describe('UserService', () => {
  let testUser: any;

  // Set up test user once for all tests
  beforeAll(async () => {
    // Create test user with preferences in a single query
    testUser = await createTestUser('user');
  });

  // Clean up database before each test
  beforeEach(async () => {
    await db.none('TRUNCATE TABLE users CASCADE');
  });

  describe('findOrCreateGoogleUser', () => {
    it('should create new user if not found', async () => {
      const profile: Profile = {
        id: 'new_google_id',
        emails: [{ value: 'new@example.com', verified: true }],
        displayName: 'New User',
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'google',
        _raw: '',
        _json: {
          iss: 'https://accounts.google.com',
          aud: 'test-client-id',
          sub: 'new_google_id',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        profileUrl: 'https://example.com/profile'
      };

      const result = await UserService.findOrCreateGoogleUser(profile);
      expect(result).toBeDefined();
      expect(result.user.google_id).toBe(profile.id);
      expect(result.user.email).toBe(profile.emails?.[0]?.value);
      expect(result.preferences).toBeDefined();
    });

    it('should update existing user if found', async () => {
      // Create initial user
      const initialProfile: Profile = {
        id: 'existing_google_id',
        emails: [{ value: 'old@example.com', verified: true }],
        displayName: 'Old User',
        photos: [{ value: 'https://example.com/old.jpg' }],
        provider: 'google',
        _raw: '',
        _json: {
          iss: 'https://accounts.google.com',
          aud: 'test-client-id',
          sub: 'existing_google_id',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        profileUrl: 'https://example.com/profile'
      };

      await UserService.findOrCreateGoogleUser(initialProfile);

      // Update with new profile
      const updatedProfile: Profile = {
        id: 'existing_google_id',
        emails: [{ value: 'updated@example.com', verified: true }],
        displayName: 'Updated User',
        photos: [{ value: 'https://example.com/new.jpg' }],
        provider: 'google',
        _raw: '',
        _json: {
          iss: 'https://accounts.google.com',
          aud: 'test-client-id',
          sub: 'existing_google_id',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        profileUrl: 'https://example.com/profile'
      };

      const result = await UserService.findOrCreateGoogleUser(updatedProfile);
      expect(result).toBeDefined();
      expect(result.user.google_id).toBe(updatedProfile.id);
      expect(result.user.email).toBe(updatedProfile.emails?.[0]?.value);
      expect(result.user.display_name).toBe(updatedProfile.displayName);
      expect(result.user.avatar_url).toBe(updatedProfile.photos?.[0]?.value);
    });

    it('should throw if preferences not found', async () => {
      // Create user without preferences
      const user = await db.one(
        'INSERT INTO users (google_id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
        ['no_prefs_id', 'no_prefs@example.com', 'No Prefs User']
      );

      const profile: Profile = {
        id: user.google_id,
        emails: [{ value: user.email, verified: true }],
        displayName: user.display_name,
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'google',
        _raw: '',
        _json: {
          iss: 'https://accounts.google.com',
          aud: 'test-client-id',
          sub: user.google_id,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        profileUrl: 'https://example.com/profile'
      };

      await expect(UserService.findOrCreateGoogleUser(profile)).rejects.toThrow();
    });
  });

  describe('getUserProfile', () => {
    it('should return user and preferences if found', async () => {
      const user = await createTestUser('profile');
      const result = await UserService.getUserProfile(user.id);
      expect(result).toBeDefined();
      expect(result?.user.id).toBe(user.id);
      expect(result?.preferences).toBeDefined();
    });

    it('should return null if user not found', async () => {
      const result = await UserService.getUserProfile(999999);
      expect(result).toBeNull();
    });

    it('should return null if preferences not found', async () => {
      // Create user without preferences
      const user = await db.one(
        'INSERT INTO users (google_id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
        ['no_prefs_profile', 'no_prefs_profile@example.com', 'No Prefs Profile User']
      );

      const result = await UserService.getUserProfile(user.id);
      expect(result).toBeNull();
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const user = await createTestUser('prefs');
      const updates = {
        theme: 'dark',
        emailNotifications: false,
        contentLanguage: 'fr',
        summaryLevel: 2
      };

      const result = await UserService.updatePreferences(user.id, updates);
      if (!result) throw new Error('Failed to update preferences');
      
      expect(result.theme).toBe(updates.theme);
      expect(result.email_notifications).toBe(updates.emailNotifications);
      expect(result.content_language).toBe(updates.contentLanguage);
      expect(result.summary_level).toBe(updates.summaryLevel);
    });
  });
}); 