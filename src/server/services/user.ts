import { Profile } from 'passport-google-oauth20';
import { pool, User, UserPreferences } from './db';
import { PoolClient, QueryResult } from 'pg';
import { withTransaction } from './db';

interface CreateUserData {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface UserProfile {
  user: User;
  preferences: UserPreferences[];
}

export class UserService {
  private static async createUserWithPreferences(
    client: PoolClient,
    userData: CreateUserData
  ): Promise<{ user: User; preferences: UserPreferences[] }> {
    // Create user
    const userResult = await client.query<User>(
      `INSERT INTO users (google_id, email, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        userData.googleId,
        userData.email,
        userData.displayName,
        userData.avatarUrl || null
      ]
    );

    const user = userResult.rows[0];

    // Create default preferences
    const defaultPreferences = {
      theme: 'light',
      email_notifications: true,
      content_language: 'en',
      summary_level: 1
    };

    // Insert preferences as a single row
    const preferencesResult = await client.query<UserPreferences>(
      `INSERT INTO user_preferences (
        user_id, 
        theme, 
        email_notifications, 
        content_language, 
        summary_level
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        user.id,
        defaultPreferences.theme,
        defaultPreferences.email_notifications,
        defaultPreferences.content_language,
        defaultPreferences.summary_level
      ]
    );

    return { 
      user, 
      preferences: [preferencesResult.rows[0]]
    };
  }

  static async findOrCreateUser(userData: CreateUserData): Promise<{ user: User; preferences: UserPreferences[] }> {
    return await withTransaction(async (client) => {
      // First check if user exists without locking
      const existingUser = await client.query<User>(
        'SELECT * FROM users WHERE google_id = $1',
        [userData.googleId]
      ).then(result => result.rows[0]);

      if (existingUser) {
        // If user exists, get preferences
        const preferences = await client.query<UserPreferences>(
          'SELECT * FROM user_preferences WHERE user_id = $1',
          [existingUser.id]
        ).then(result => result.rows);

        return { user: existingUser, preferences };
      }

      // If user doesn't exist, acquire locks in order (users first, then preferences)
      await client.query('LOCK TABLE users IN SHARE MODE');
      await client.query('LOCK TABLE user_preferences IN SHARE MODE');

      // Double check user doesn't exist after acquiring lock
      const doubleCheck = await client.query<User>(
        'SELECT * FROM users WHERE google_id = $1 FOR UPDATE',
        [userData.googleId]
      ).then(result => result.rows[0]);

      if (doubleCheck) {
        // Another transaction created the user while we were waiting for the lock
        const preferences = await client.query<UserPreferences>(
          'SELECT * FROM user_preferences WHERE user_id = $1',
          [doubleCheck.id]
        ).then(result => result.rows);

        return { user: doubleCheck, preferences };
      }

      return await UserService.createUserWithPreferences(client, userData);
    });
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    // No need for transaction or locks for a simple read
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findUserById(id: number): Promise<User | null> {
    // No need for transaction or locks for a simple read
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findOrCreateGoogleUser(
    profile: Profile
  ): Promise<{
    user: User;
    preferences: UserPreferences[];
  }> {
    return await withTransaction(async (client) => {
      // First check if user exists without locking
      let user = await client.query<User>(
        'SELECT * FROM users WHERE google_id = $1',
        [profile.id]
      ).then(result => result.rows[0]);

      if (!user) {
        // Create new user with preferences
        const result = await UserService.createUserWithPreferences(client, {
          googleId: profile.id,
          email: profile.emails?.[0]?.value || '',
          displayName: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value || null
        });
        user = result.user;
      } else {
        // Update existing user's info if needed
        const updates: Partial<User> = {};
        
        if (profile.displayName !== user.display_name) {
          updates.display_name = profile.displayName;
        }
        
        if (profile.photos?.[0]?.value !== user.avatar_url) {
          updates.avatar_url = profile.photos?.[0]?.value || null;
        }

        if (profile.emails?.[0]?.value !== user.email) {
          updates.email = profile.emails?.[0]?.value;
        }

        if (Object.keys(updates).length > 0) {
          const updateFields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`);
          const updateValues = Object.values(updates);
          updateValues.push(user.id);
          
          const result = await client.query<User>(
            `UPDATE users 
             SET ${updateFields.join(', ')}, updated_at = NOW()
             WHERE id = $${updateValues.length}
             RETURNING *`,
            updateValues
          );
          user = result.rows[0];
        }
      }

      // Get preferences
      const preferencesResult = await client.query<UserPreferences>(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [user.id]
      );
      const preferences = preferencesResult.rows;
      
      if (!preferences.length) {
        throw new Error(`User preferences not found for user ${user.id}`);
      }

      return { user, preferences };
    });
  }

  static async getUserProfile(userId: number): Promise<UserProfile | null> {
    return await withTransaction(async (client) => {
      // Get user without lock since we're just reading
      const userResult = await client.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];

      // Get preferences
      const prefsResult = await client.query<UserPreferences>(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
      );

      if (prefsResult.rows.length === 0) {
        return null;
      }

      return {
        user,
        preferences: prefsResult.rows
      };
    });
  }

  static async updatePreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences | null> {
    return await withTransaction(async (client) => {
      // First check if user exists without lock
      const userResult = await client.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      // Get current preferences with lock
      const prefsResult = await client.query<UserPreferences>(
        'SELECT * FROM user_preferences WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (prefsResult.rows.length === 0) {
        // Create preferences with provided updates and defaults for missing fields
        const defaultPrefs = {
          theme: 'light',
          email_notifications: true,
          content_language: 'en',
          summary_level: 1,
          ...updates
        };

        const result = await client.query<UserPreferences>(
          `INSERT INTO user_preferences (
            user_id, 
            theme, 
            email_notifications, 
            content_language, 
            summary_level
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
          [
            userId,
            defaultPrefs.theme,
            defaultPrefs.email_notifications,
            defaultPrefs.content_language,
            defaultPrefs.summary_level
          ]
        );
        return result.rows[0];
      }

      // Update preferences
      const updateFields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`);
      const updateValues = Object.values(updates);
      updateValues.unshift(userId); // Add userId as first parameter

      const result = await client.query<UserPreferences>(
        `UPDATE user_preferences 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        updateValues
      );

      return result.rows[0];
    });
  }

  static async updateUser(userId: number, updates: Partial<User>): Promise<User | null> {
    return await withTransaction(async (client) => {
      const updateFields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`);
      const updateValues = Object.values(updates);
      updateValues.unshift(userId); // Add userId as first parameter

      const result = await client.query<User>(
        `UPDATE users 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        updateValues
      );

      return result.rows[0] || null;
    });
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async updateById(id: number, data: Partial<User>): Promise<User | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    values.push(id);

    const result = await pool.query<User>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }
} 