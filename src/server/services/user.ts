import { Profile } from 'passport-google-oauth20';
import { pool, User, UserPreferences } from './db';

interface CreateUserData {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export class UserService {
  static async findOrCreateUser(userData: CreateUserData): Promise<{ user: User; preferences: UserPreferences }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Try to find existing user
      const existingUser = await client.query<User>(
        'SELECT * FROM users WHERE google_id = $1',
        [userData.googleId]
      ).then(result => result.rows[0]);

      if (existingUser) {
        // Get existing preferences
        const preferences = await client.query<UserPreferences>(
          'SELECT * FROM user_preferences WHERE user_id = $1',
          [existingUser.id]
        ).then(result => result.rows[0]);

        await client.query('COMMIT');
        return { user: existingUser, preferences };
      }

      // Create new user
      const user = await client.query<User>(
        `INSERT INTO users (google_id, email, display_name, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userData.googleId, userData.email, userData.displayName, userData.avatarUrl]
      ).then(result => result.rows[0]);

      // Create default preferences
      const preferences = await client.query<UserPreferences>(
        `INSERT INTO user_preferences (user_id, theme, email_notifications, content_language, summary_level)
         VALUES ($1, 'light', true, 'en', 1)
         RETURNING *`,
        [user.id]
      ).then(result => result.rows[0]);

      await client.query('COMMIT');
      return { user, preferences };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findUserById(id: number): Promise<User | null> {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findOrCreateGoogleUser(profile: Profile): Promise<{
    user: User;
    preferences: UserPreferences;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Try to find existing user
      let user = await client.query<User>(
        'SELECT * FROM users WHERE google_id = $1',
        [profile.id]
      ).then(result => result.rows[0]);

      if (!user) {
        // Create new user with preferences
        const result = await UserService.findOrCreateUser({
          googleId: profile.id,
          email: profile.emails?.[0]?.value || '',
          displayName: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value || null
        });
        user = result.user;
      } else {
        // Update existing user's info
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

      // Get user preferences
      const preferencesResult = await client.query<UserPreferences>(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [user.id]
      );
      const preferences = preferencesResult.rows[0];
      
      if (!preferences) {
        await client.query('ROLLBACK');
        throw new Error(`User preferences not found for user ${user.id}`);
      }

      await client.query('COMMIT');
      return { user, preferences };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUserProfile(userId: number): Promise<{
    user: User;
    preferences: UserPreferences;
  } | null> {
    const userResult = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) return null;

    const preferencesResult = await pool.query<UserPreferences>(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    const preferences = preferencesResult.rows[0];
    if (!preferences) return null;

    return { user, preferences };
  }

  static async updatePreferences(
    userId: number,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences | null> {
    // Convert camelCase keys to snake_case for database
    const snakeCaseUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCaseUpdates[snakeKey] = value;
    });

    const updateFields = Object.keys(snakeCaseUpdates).map((key, i) => `${key} = $${i + 1}`);
    const updateValues = Object.values(snakeCaseUpdates);
    updateValues.push(userId);

    const result = await pool.query<UserPreferences>(
      `UPDATE user_preferences 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE user_id = $${updateValues.length}
       RETURNING *`,
      updateValues
    );

    return result.rows[0] || null;
  }
} 