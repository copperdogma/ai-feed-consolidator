import { Profile } from 'passport-google-oauth20';
import { db, User, UserPreferences } from './db';

export class UserService {
  static async findOrCreateGoogleUser(profile: Profile): Promise<{
    user: User;
    preferences: UserPreferences;
  }> {
    // Try to find existing user
    let user = await db.getUserByGoogleId(profile.id);

    if (!user) {
      // Create new user if not found
      user = await db.createUser({
        google_id: profile.id,
        email: profile.emails?.[0]?.value || '',
        display_name: profile.displayName,
        avatar_url: profile.photos?.[0]?.value || null,
      });
    } else {
      // Update existing user's info
      const updates: Partial<User> = {};
      
      if (profile.displayName !== user.display_name) {
        updates.display_name = profile.displayName;
      }
      
      if (profile.photos?.[0]?.value !== user.avatar_url) {
        updates.avatar_url = profile.photos?.[0]?.value || null;
      }

      if (Object.keys(updates).length > 0) {
        user = (await db.updateUser(user.id, updates))!;
      }
    }

    // Get user preferences
    const preferences = await db.getUserPreferences(user.id);
    if (!preferences) {
      throw new Error(`User preferences not found for user ${user.id}`);
    }

    return { user, preferences };
  }

  static async getUserProfile(userId: number): Promise<{
    user: User;
    preferences: UserPreferences;
  } | null> {
    const user = await db.getUserById(userId);
    if (!user) return null;

    const preferences = await db.getUserPreferences(userId);
    if (!preferences) return null;

    return { user, preferences };
  }

  static async updatePreferences(
    userId: number,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences | null> {
    return db.updateUserPreferences(userId, updates);
  }
} 