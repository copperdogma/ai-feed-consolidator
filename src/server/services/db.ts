import pg from 'pg';
import { config } from '../config';

// Types based on our database schema
export interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  user_id: number;
  theme: 'light' | 'dark';
  email_notifications: boolean;
  content_language: string;
  summary_level: 1 | 2;
  created_at: Date;
  updated_at: Date;
}

// Create a connection pool
const pool = new pg.Pool({
  connectionString: config.databaseUrl,
});

export const db = {
  pool, // Expose pool for testing
  // User operations
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { google_id, email, display_name, avatar_url } = userData;
    
    const result = await pool.query<User>(
      `INSERT INTO users (google_id, email, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [google_id, email, display_name, avatar_url]
    );

    // Create default preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)`,
      [result.rows[0].id]
    );

    return result.rows[0];
  },

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    const result = await pool.query<User>(
      `SELECT * FROM users WHERE google_id = $1`,
      [googleId]
    );
    return result.rows[0] || null;
  },

  async getUserById(id: number): Promise<User | null> {
    const result = await pool.query<User>(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    const fields = Object.keys(data)
      .filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at')
      .map((key, index) => `${key} = $${index + 2}`);
    
    if (fields.length === 0) return null;

    const values = Object.values(data).filter(
      val => val !== undefined && val !== null
    );

    const result = await pool.query<User>(
      `UPDATE users 
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      [id, ...values]
    );

    return result.rows[0] || null;
  },

  // User preferences operations
  async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    const result = await pool.query<UserPreferences>(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  async updateUserPreferences(
    userId: number,
    data: Partial<UserPreferences>
  ): Promise<UserPreferences | null> {
    const fields = Object.keys(data)
      .filter(key => key !== 'user_id' && key !== 'created_at' && key !== 'updated_at')
      .map((key, index) => `${key} = $${index + 2}`);
    
    if (fields.length === 0) return null;

    const values = Object.values(data).filter(
      val => val !== undefined && val !== null
    );

    const result = await pool.query<UserPreferences>(
      `UPDATE user_preferences 
       SET ${fields.join(', ')}
       WHERE user_id = $1
       RETURNING *`,
      [userId, ...values]
    );

    return result.rows[0] || null;
  },
}; 