import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user';
import { db } from '../db';
import type { Profile } from 'passport-google-oauth20';

// Mock the database service
vi.mock('../db', () => ({
  db: {
    createUser: vi.fn(),
    getUserByGoogleId: vi.fn(),
    getUserById: vi.fn(),
    getUserPreferences: vi.fn(),
    updateUser: vi.fn(),
    updateUserPreferences: vi.fn(),
  },
}));

describe('UserService', () => {
  const mockProfile: Partial<Profile> = {
    id: 'google123',
    displayName: 'Test User',
    emails: [{ value: 'test@example.com', verified: true }],
    photos: [{ value: 'https://example.com/photo.jpg' }],
  };

  const mockUser = {
    id: 1,
    google_id: 'google123',
    email: 'test@example.com',
    display_name: 'Test User',
    avatar_url: 'https://example.com/photo.jpg',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPreferences = {
    user_id: 1,
    theme: 'light' as const,
    email_notifications: true,
    content_language: 'en',
    summary_level: 1 as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findOrCreateGoogleUser', () => {
    it('should create new user if not found', async () => {
      vi.mocked(db.getUserByGoogleId).mockResolvedValue(null);
      vi.mocked(db.createUser).mockResolvedValue(mockUser);
      vi.mocked(db.getUserPreferences).mockResolvedValue(mockPreferences);

      const result = await UserService.findOrCreateGoogleUser(mockProfile as Profile);

      expect(db.getUserByGoogleId).toHaveBeenCalledWith(mockProfile.id);
      expect(db.createUser).toHaveBeenCalledWith({
        google_id: mockProfile.id,
        email: mockProfile.emails![0].value,
        display_name: mockProfile.displayName,
        avatar_url: mockProfile.photos![0].value,
      });
      expect(result).toEqual({ user: mockUser, preferences: mockPreferences });
    });

    it('should update existing user if found', async () => {
      const existingUser = { ...mockUser, display_name: 'Old Name' };
      vi.mocked(db.getUserByGoogleId).mockResolvedValue(existingUser);
      vi.mocked(db.updateUser).mockResolvedValue(mockUser);
      vi.mocked(db.getUserPreferences).mockResolvedValue(mockPreferences);

      const result = await UserService.findOrCreateGoogleUser(mockProfile as Profile);

      expect(db.getUserByGoogleId).toHaveBeenCalledWith(mockProfile.id);
      expect(db.updateUser).toHaveBeenCalledWith(existingUser.id, {
        display_name: mockProfile.displayName,
      });
      expect(result).toEqual({ user: mockUser, preferences: mockPreferences });
    });

    it('should throw if preferences not found', async () => {
      vi.mocked(db.getUserByGoogleId).mockResolvedValue(mockUser);
      vi.mocked(db.getUserPreferences).mockResolvedValue(null);

      await expect(
        UserService.findOrCreateGoogleUser(mockProfile as Profile)
      ).rejects.toThrow('User preferences not found');
    });
  });

  describe('getUserProfile', () => {
    it('should return user and preferences if found', async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser);
      vi.mocked(db.getUserPreferences).mockResolvedValue(mockPreferences);

      const result = await UserService.getUserProfile(1);

      expect(result).toEqual({ user: mockUser, preferences: mockPreferences });
    });

    it('should return null if user not found', async () => {
      vi.mocked(db.getUserById).mockResolvedValue(null);

      const result = await UserService.getUserProfile(1);

      expect(result).toBeNull();
      expect(db.getUserPreferences).not.toHaveBeenCalled();
    });

    it('should return null if preferences not found', async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser);
      vi.mocked(db.getUserPreferences).mockResolvedValue(null);

      const result = await UserService.getUserProfile(1);

      expect(result).toBeNull();
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const updates = { theme: 'dark' as const, summary_level: 2 as const };
      vi.mocked(db.updateUserPreferences).mockResolvedValue({
        ...mockPreferences,
        ...updates,
      });

      const result = await UserService.updatePreferences(1, updates);

      expect(db.updateUserPreferences).toHaveBeenCalledWith(1, updates);
      expect(result).toEqual({ ...mockPreferences, ...updates });
    });
  });
}); 