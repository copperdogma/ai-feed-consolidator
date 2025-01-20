import pkg from 'pg';
const { Pool } = pkg;
import { config } from '../config';

// Types based on our database schema
export interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  user_id: number;
  theme: string;
  email_notifications: boolean;
  content_language: string;
  summary_level: number;
  created_at: Date;
  updated_at: Date;
}

// Create a connection pool with appropriate settings for testing
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10, // Reduced from 20 to prevent too many concurrent connections
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Increased from 2000ms to 5000ms
  statement_timeout: 30000, // 30 seconds statement timeout
  query_timeout: 30000, // 30 seconds query timeout
});

// Add an error handler for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Constants for transaction retries
const MAX_TRANSACTION_RETRIES = 3;
const DEADLOCK_ERROR_CODE = '40P01';
const STATEMENT_TIMEOUT_ERROR_CODE = '57014';

// Helper function to wait with exponential backoff
async function wait(attempt: number): Promise<void> {
  const delay = Math.min(100 * Math.pow(2, attempt), 1000); // Max 1 second delay
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Helper function for running queries in a transaction with retries
export async function withTransaction<T>(callback: (client: pkg.PoolClient) => Promise<T>): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Set statement timeout for this transaction
      await client.query('SET statement_timeout = 30000'); // 30 seconds
      
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      lastError = error;

      // Only retry on deadlock or statement timeout
      if (error.code !== DEADLOCK_ERROR_CODE && error.code !== STATEMENT_TIMEOUT_ERROR_CODE) {
        throw error;
      }

      if (attempt === MAX_TRANSACTION_RETRIES - 1) {
        throw error;
      }

      console.warn(`Transaction attempt ${attempt + 1} failed, retrying:`, error);
      await wait(attempt);
    } finally {
      client.release();
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

export async function createUser(data: {
  google_id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
}): Promise<User> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create user
    const userResult = await client.query<User>(
      `INSERT INTO users (google_id, email, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.google_id, data.email, data.display_name, data.avatar_url || null]
    );

    // Create default preferences
    await client.query(
      `INSERT INTO user_preferences (user_id, theme, email_notifications, content_language, summary_level)
       VALUES ($1, 'light', true, 'en', 1)`,
      [userResult.rows[0].id]
    );

    await client.query('COMMIT');
    return userResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  return withTransaction(async (client) => {
    const result = await client.query<User>(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] || null;
  });
}

export async function getUserById(id: number): Promise<User | null> {
  return withTransaction(async (client) => {
    const result = await client.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  });
}

export async function updateUser(id: number, data: Partial<User>): Promise<User | null> {
  return withTransaction(async (client) => {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.display_name !== undefined) {
      updates.push(`display_name = $${paramCount}`);
      values.push(data.display_name);
      paramCount++;
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(data.email);
      paramCount++;
    }

    if (data.avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount}`);
      values.push(data.avatar_url);
      paramCount++;
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(id);
    const result = await client.query<User>(
      `UPDATE users 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  });
}

export async function getUserPreferences(userId: number): Promise<UserPreferences | null> {
  return withTransaction(async (client) => {
    const result = await client.query<UserPreferences>(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  });
}

export async function updateUserPreferences(
  userId: number,
  preferences: Partial<UserPreferences>
): Promise<UserPreferences | null> {
  return withTransaction(async (client) => {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (preferences.theme !== undefined) {
      updates.push(`theme = $${paramCount}`);
      values.push(preferences.theme);
      paramCount++;
    }

    if (preferences.email_notifications !== undefined) {
      updates.push(`email_notifications = $${paramCount}`);
      values.push(preferences.email_notifications);
      paramCount++;
    }

    if (preferences.content_language !== undefined) {
      updates.push(`content_language = $${paramCount}`);
      values.push(preferences.content_language);
      paramCount++;
    }

    if (preferences.summary_level !== undefined) {
      updates.push(`summary_level = $${paramCount}`);
      values.push(preferences.summary_level);
      paramCount++;
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(userId);
    const result = await client.query<UserPreferences>(
      `UPDATE user_preferences 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE user_id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  });
} 