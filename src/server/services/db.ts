import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { logger } from '../logger';
import { getServiceContainer } from './service-container';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// Import the pg-promise database instance
import { db, pgp } from '../db/db';
import { IDatabase } from 'pg-promise';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a typed db reference to fix the typescript errors
// This is the correct way to type pg-promise for TypeScript
interface IExtensions {
  // Add any custom extensions/methods here
}

// Define types for our database entities
export interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  id: number;
  user_id: number;
  theme: string;
  created_at: Date;
  updated_at: Date;
}

export interface LoginHistory {
  id: number;
  user_id: number;
  login_at: Date;
  ip_address: string;
  user_agent: string;
}

// Cast db to the proper type to avoid TypeScript errors with method calls
// IMPORTANT: We no longer use this directly - instead we use getPool() to get the database from the service container
// This ensures tests use the correct database connection
// const typedDb = db as IDatabase<IExtensions>;

// NOTE: Never create tables here. Use the existing migrations.

// Get the database object from the service container
// This now returns the pg-promise IDatabase instance
export function getPool(): IDatabase<IExtensions> {
  return getServiceContainer().getPool() as IDatabase<IExtensions>;
}

// This function is intentionally deprecated. Use pg-promise methods instead.
// It's kept for compatibility but throws an error to prevent using the old client-based approach.
export async function getClient(): Promise<PoolClient> {
  throw new Error('getClient is deprecated. Use pg-promise methods from the db object instead.');
}

// Helper function to get a client from the pool
// This still returns a PostgreSQL PoolClient for backward compatibility
export async function withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  // Use pg-promise's task instead of PoolClient
  return getPool().task(async (t: any) => {
    // Wrap the pg-promise task in a compatibility layer to use with existing code
    const compatClient = {
      query: (sql: string, params?: any[]) => t.query(sql, params),
      release: () => { /* No-op, pg-promise handles this */ }
    } as unknown as PoolClient;
    
    return await callback(compatClient);
  });
}

// Helper function to execute a query within a transaction
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  // Use pg-promise's tx instead of manual BEGIN/COMMIT/ROLLBACK
  return getPool().tx(async (t: any) => {
    // Wrap the pg-promise task in a compatibility layer to use with existing code
    const compatClient = {
      query: (sql: string, params?: any[]) => t.query(sql, params),
      release: () => { /* No-op, pg-promise handles this */ }
    } as unknown as PoolClient;
    
    return await callback(compatClient);
  });
}

// Helper function to execute a query with automatic client handling
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  // Use pg-promise directly instead of withClient
  return getPool().any(sql, params);
}

// Helper function to execute a query and return a single row or null
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return getPool().oneOrNone(sql, params);
}

// Helper function to execute a count query
export async function queryCount(sql: string, params: any[] = []): Promise<number> {
  const result = await getPool().one(sql, params);
  return parseInt(result.count, 10);
}

// Helper function to execute a query and return the number of affected rows
export async function execute(sql: string, params: any[] = []): Promise<number> {
  const result = await getPool().result(sql, params);
  return result.rowCount;
}

// Helper function to check if a record exists
export async function exists(sql: string, params: any[] = []): Promise<boolean> {
  const result = await getPool().oneOrNone(sql, params);
  return !!result;
}

// Helper function to get the current timestamp from the database
// This ensures we're using the database's clock, not the application server's
export async function getCurrentTimestamp(): Promise<Date> {
  const result = await getPool().one('SELECT NOW() as now');
  return result.now;
}

// Check if the database is healthy
export async function checkHealth(): Promise<boolean> {
  try {
    const result = await getPool().one('SELECT 1 as health_check');
    return result.health_check === 1;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
}

// User-related functions

export async function createUser(data: {
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
}): Promise<User> {
  // Use pg-promise's transaction
  return getPool().tx(async (t: any) => {
    // Create user
    const user = await t.one(
      `INSERT INTO users (
        google_id, email, display_name, avatar_url, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, NOW(), NOW()
      ) RETURNING *`,
      [data.google_id, data.email, data.display_name, data.avatar_url]
    );
    
    // Create default preferences
    await t.none(
      `INSERT INTO user_preferences (
        user_id, theme, created_at, updated_at
      ) VALUES (
        $1, 'light', NOW(), NOW()
      )`,
      [user.id]
    );
    
    return user;
  });
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  return getPool().oneOrNone(
    'SELECT * FROM users WHERE google_id = $1',
    [googleId]
  );
}

export async function getUserById(id: number): Promise<User | null> {
  return getPool().oneOrNone(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
  // Build the SET clause dynamically based on provided updates
  const setClauses = [];
  const values = [];
  let paramIndex = 1;
  
  if (updates.display_name !== undefined) {
    setClauses.push(`display_name = $${paramIndex++}`);
    values.push(updates.display_name);
  }
  
  if (updates.avatar_url !== undefined) {
    setClauses.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatar_url);
  }
  
  if (updates.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  
  // Always update the updated_at timestamp
  setClauses.push(`updated_at = NOW()`);
  
  // Add the user ID as the last parameter
  values.push(id);
  
  // If no updates were provided, just return the current user
  if (setClauses.length === 1) { // Only updated_at
    return getUserById(id);
  }
  
  // Execute the update
  return getPool().oneOrNone(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
}

// User preferences functions

export async function getUserPreferences(userId: number): Promise<UserPreferences | null> {
  // First check if preferences exist
  const prefs = await getPool().oneOrNone(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );
  
  // If preferences exist, return them
  if (prefs) {
    return prefs;
  }
  
  // If not, create default preferences
  return getPool().one(
    `INSERT INTO user_preferences (
      user_id, theme, created_at, updated_at
    ) VALUES (
      $1, 'light', NOW(), NOW()
    ) RETURNING *`,
    [userId]
  );
}

export async function updateUserPreferences(
  userId: number, 
  updates: Partial<UserPreferences>
): Promise<UserPreferences | null> {
  // First check if preferences exist
  const prefs = await getUserPreferences(userId);
  
  if (!prefs) {
    return null;
  }
  
  // Build the SET clause dynamically based on provided updates
  const setClauses = [];
  const values = [];
  let paramIndex = 1;
  
  if (updates.theme !== undefined) {
    setClauses.push(`theme = $${paramIndex++}`);
    values.push(updates.theme);
  }
  
  // Always update the updated_at timestamp
  setClauses.push(`updated_at = NOW()`);
  
  // Add the user ID as the last parameter
  values.push(userId);
  
  // If no updates were provided, just return the current preferences
  if (setClauses.length === 1) { // Only updated_at
    return prefs;
  }
  
  // Execute the update
  return getPool().oneOrNone(
    `UPDATE user_preferences SET ${setClauses.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
    values
  );
}

// Database initialization and migration functions

export async function initializeDatabase(): Promise<void> {
  try {
    // Check if the database is already initialized
    const tablesExist = await getPool().oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      ) as exists
    `);
    
    if (tablesExist && tablesExist.exists) {
      logger.info('Database already initialized');
      return;
    }
    
    // If not, run the migration
    logger.info('Initializing database...');
    
    // Read and execute the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '20250204000000-initial-schema.cjs');
    const migration = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration
    await getPool().none(migration);
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
}

// Don't auto-initialize in this file - let index.ts control the initialization
// if (process.env.NODE_ENV !== 'test') {
//   initializeDatabase().catch(err => {
//     console.error('Database initialization failed:', err);
//     process.exit(1);
//   });
// } 