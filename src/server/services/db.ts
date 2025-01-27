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
  feedly_access_token: string | null;
  feedly_refresh_token: string | null;
  feedly_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  id: number;
  user_id: number;
  preference_key: string;
  preference_value: any;
  created_at: Date;
  updated_at: Date;
}

// Create a connection pool with appropriate settings for testing
export const pool = new Pool({
  connectionString: config.database.url,
  max: 10, // Reduced from 20 to prevent too many concurrent connections
  idleTimeoutMillis: 60000, // Increased to 60 seconds
  connectionTimeoutMillis: 10000, // Increased to 10 seconds
  statement_timeout: 60000, // Increased to 60 seconds
  query_timeout: 60000, // Increased to 60 seconds
  allowExitOnIdle: true, // Allow the pool to clean up on process exit
});

// Add an error handler for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Attempt to close the client gracefully
  try {
    client.release(true); // Force release
  } catch (releaseErr) {
    console.error('Error releasing client after pool error:', releaseErr);
  }
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
  preferences: Record<string, any>
): Promise<UserPreferences[]> {
  return withTransaction(async (client) => {
    const results = await Promise.all(
      Object.entries(preferences).map(([key, value]) =>
        client.query<UserPreferences>(
          `INSERT INTO user_preferences (user_id, preference_key, preference_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, preference_key) DO UPDATE
           SET preference_value = $3, updated_at = NOW()
           RETURNING *`,
          [userId, key, JSON.stringify(value)]
        )
      )
    );

    return results.map(r => r.rows[0]);
  });
}

// Function to initialize database schema
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Set longer timeouts for schema operations
    await client.query('SET statement_timeout = 120000'); // 2 minutes
    await client.query('SET lock_timeout = 120000'); // 2 minutes
    
    // Drop all indexes first to avoid conflicts
    const dropIndexes = [
      'idx_users_google_id',
      'idx_sessions_expire',
      'idx_login_history_user_id',
      'idx_login_history_created_at',
      'idx_login_history_login_time',
      'idx_feed_configs_user_id',
      'idx_feed_items_source',
      'idx_feed_items_published_at'
    ];

    for (const index of dropIndexes) {
      try {
        await client.query(`DROP INDEX IF EXISTS ${index}`);
      } catch (error) {
        console.warn(`Failed to drop index ${index}:`, error);
        // Continue with other operations
      }
    }

    // Start transaction for table operations
    await client.query('BEGIN');
    try {
      // Drop and recreate sessions table to ensure clean state
      await client.query('DROP TABLE IF EXISTS sessions CASCADE');

      // Create users table first
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          google_id TEXT UNIQUE NOT NULL,
          email TEXT NOT NULL,
          display_name TEXT NOT NULL,
          avatar_url TEXT,
          feedly_access_token TEXT,
          feedly_refresh_token TEXT,
          feedly_user_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create user_preferences table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          theme TEXT NOT NULL DEFAULT 'light',
          email_notifications BOOLEAN NOT NULL DEFAULT true,
          content_language TEXT NOT NULL DEFAULT 'en',
          summary_level INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create sessions table
      await client.query(`
        CREATE TABLE sessions (
          sid TEXT PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) WITH TIME ZONE NOT NULL
        )
      `);

      // Create login_history table
      await client.query(`
        CREATE TABLE IF NOT EXISTS login_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          success BOOLEAN NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          failure_reason TEXT,
          request_path TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create feed_configs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS feed_configs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          feed_url TEXT NOT NULL,
          title TEXT,
          description TEXT,
          site_url TEXT,
          icon_url TEXT,
          last_fetched_at TIMESTAMP WITH TIME ZONE,
          error_count INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          fetch_interval_minutes INTEGER NOT NULL DEFAULT 60,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create feed_items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS feed_items (
          id SERIAL PRIMARY KEY,
          source_id TEXT NOT NULL,
          source_type TEXT NOT NULL,
          title TEXT NOT NULL,
          author TEXT,
          content TEXT,
          summary TEXT,
          url TEXT NOT NULL,
          published_at TIMESTAMP WITH TIME ZONE NOT NULL,
          raw_metadata JSONB,
          feed_config_id INTEGER REFERENCES feed_configs(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(source_type, source_id)
        )
      `);

      // Create item_states table
      await client.query(`
        CREATE TABLE IF NOT EXISTS item_states (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
          is_read BOOLEAN DEFAULT false,
          is_saved BOOLEAN DEFAULT false,
          last_synced_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, feed_item_id)
        )
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Create indexes outside of transaction, one at a time
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire)',
      'CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON login_history(login_time)',
      'CREATE INDEX IF NOT EXISTS idx_feed_configs_user_id ON feed_configs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_feed_items_source ON feed_items(source_type, source_id)',
      'CREATE INDEX IF NOT EXISTS idx_feed_items_feed_config ON feed_items(feed_config_id) WHERE feed_config_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_item_states_user ON item_states(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_item_states_feed_item ON item_states(feed_item_id)',
      'CREATE INDEX IF NOT EXISTS idx_item_states_user_saved ON item_states(user_id) WHERE is_saved = true',
      'CREATE INDEX IF NOT EXISTS idx_feed_items_published_at ON feed_items(published_at DESC)'
    ];

    for (const createIndex of createIndexes) {
      try {
        // Check if column exists first
        const colExists = await client.query(`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name='feed_items' 
            AND column_name='feed_config_id'
          )
        `);
        
        if (colExists.rows[0].exists) {
          await client.query(createIndex);
        }
      } catch (error) {
        console.warn(`Failed to create index with query ${createIndex}:`, error);
        // Continue with other operations
      }
    }
  } finally {
    client.release();
  }
}

async function validateSchema() {
  const requiredColumns = {
    feed_items: ['feed_config_id'],
    feed_configs: ['user_id', 'feed_url']
  };

  for (const [table, columns] of Object.entries(requiredColumns)) {
    const { rows } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);

    const existingColumns = rows.map(r => r.column_name);
    
    for (const col of columns) {
      if (!existingColumns.includes(col)) {
        throw new Error(`Missing required column ${col} in table ${table}`);
      }
    }
  }
}

// Call during service initialization
validateSchema().catch(err => {
  console.error('Schema validation failed:', err);
  process.exit(1);
}); 