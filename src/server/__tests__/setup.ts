import { beforeAll, afterAll, expect } from 'vitest';
import { config } from 'dotenv';
import { Request } from 'express';
import { User } from '../services/db';
import supertest from 'supertest';
import { SuperAgentTest } from 'supertest';
import express from 'express';
import { createApp } from '../app';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool, PoolClient } from 'pg';
import { pool, withTransaction, initializeDatabase } from '../services/db';

// Load environment variables
config({ path: '.env.test' });

// Set test-specific environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';

// Get current file's directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants for cleanup
const CLEANUP_LOCK_ID = 41724;
const RETRY_DELAY_BASE = 500; // Increased from 200ms to 500ms
const MAX_LOCK_WAIT = 5000; // Increased from 2s to 5s
const STATEMENT_TIMEOUT = 5000; // Increased from 2s to 5s

// Tables in dependency order (children first, parents last)
const TABLES_IN_ORDER = [
  'login_history',
  'user_preferences',
  'sessions',
  'users'
] as const;

// Helper function to wait with exponential backoff and jitter
async function wait(attempt: number): Promise<void> {
  const delay = Math.min(RETRY_DELAY_BASE * Math.pow(1.5, attempt), 2000); // Reduced max delay and exponential factor
  const jitter = Math.random() * 50; // Reduced jitter range
  await new Promise(resolve => setTimeout(resolve, delay + jitter));
}

// Track if database has been initialized
let isDatabaseInitialized = false;

// Run migrations before any tests
beforeAll(async () => {
  if (!isDatabaseInitialized) {
    await resetDatabase();
    isDatabaseInitialized = true;
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Only end the pool if we're in the main test process
  if (process.env.VITEST_POOL_ID === '1') {
    await pool.end();
  }
});

// Create a test user for authentication tests
export async function createTestUser(): Promise<User> {
  try {
    return await withTransaction(async (client: PoolClient) => {
      await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); // Changed from REPEATABLE READ for better concurrency

      // Create new user with preferences using UPSERT
      const result = await client.query<User>(
        `INSERT INTO users (google_id, email, display_name, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_id) 
         DO UPDATE SET 
           email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           avatar_url = EXCLUDED.avatar_url
         RETURNING *`,
        ['test-google-id', 'test@example.com', 'Test User', 'https://example.com/picture.jpg']
      );

      const user = result.rows[0];

      // Create or update user preferences
      await client.query(
        `INSERT INTO user_preferences (user_id, theme, email_notifications, content_language, summary_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id)
         DO UPDATE SET
           theme = EXCLUDED.theme,
           email_notifications = EXCLUDED.email_notifications,
           content_language = EXCLUDED.content_language,
           summary_level = EXCLUDED.summary_level`,
        [user.id, 'light', true, 'en', 1]
      );

      return user;
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

// Verify that a test user exists
export async function verifyTestUser(userId: number): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

// Create an authenticated agent for testing protected routes
export async function createAuthenticatedAgent(): Promise<ReturnType<typeof supertest.agent>> {
  const app = createApp();
  const agent = supertest.agent(app);
  const testUser = await createTestUser();

  // Mock the session data
  const mockSession = {
    passport: {
      user: testUser.id
    }
  };

  // Set up the agent with the session
  await agent
    .post('/api/auth/session')
    .send(mockSession)
    .expect(200);

  return agent;
}

// Optimized database cleanup function
export async function cleanupDatabase() {
  let client: PoolClient | null = null;
  let retries = 0;
  const maxRetries = 2; // Reduced from 3 to 2

  while (retries < maxRetries) {
    try {
      if (!client) {
        client = await pool.connect();
      }

      // Try to acquire the cleanup lock with timeout
      const lockResult = await client.query(
        `SELECT pg_try_advisory_lock($1) as acquired, 
                pg_try_advisory_lock_shared($2) as shared_acquired`,
        [CLEANUP_LOCK_ID, CLEANUP_LOCK_ID + 1]
      );

      if (!lockResult.rows[0].acquired) {
        if (lockResult.rows[0].shared_acquired) {
          // If we got the shared lock but not the exclusive lock, someone else is cleaning
          await client.query('SELECT pg_advisory_unlock_shared($1)', [CLEANUP_LOCK_ID + 1]);
          await wait(retries);
          continue;
        }
        // Try to get the lock with a timeout
        await client.query(`SET LOCAL lock_timeout = '${MAX_LOCK_WAIT}ms'`);
        await client.query('SELECT pg_advisory_lock($1)', [CLEANUP_LOCK_ID]);
      }

      // Start a new transaction with optimized settings
      await client.query('BEGIN');
      await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT}`);
      await client.query(`SET LOCAL lock_timeout = ${MAX_LOCK_WAIT}`);
      await client.query(`SET LOCAL idle_in_transaction_session_timeout = ${STATEMENT_TIMEOUT * 2}`);
      await client.query('SET LOCAL transaction_isolation = \'read committed\'');
      await client.query('SET session_replication_role = replica'); // Disable triggers and foreign keys

      // Clean tables in parallel using Promise.all
      await Promise.all(TABLES_IN_ORDER.map(async (table) => {
        try {
          await client?.query(`TRUNCATE TABLE "${table}" CASCADE`);
          console.log(`Cleaned table: ${table}`);
        } catch (error: any) {
          if (error.code === '55P03') { // Lock not available
            throw error; // Let the outer try-catch handle it
          }
          console.error(`Error cleaning table ${table}:`, error);
          throw error;
        }
      }));

      await client.query('SET session_replication_role = default');
      await client.query('COMMIT');
      console.log('Database cleanup completed successfully');
      return;

    } catch (error: any) {
      console.error('Error during cleanup:', error);
      
      if (client) {
        try {
          await client.query('ROLLBACK').catch(() => {});
          if (error.code === '25P02') { // Current transaction is aborted
            client.release();
            client = null;
          }
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      
      if (retries < maxRetries - 1) {
        retries++;
        console.log(`Retrying cleanup (attempt ${retries + 1}/${maxRetries})...`);
        await wait(retries);
      } else {
        throw error;
      }
    } finally {
      if (client) {
        try {
          await client.query('SELECT pg_advisory_unlock($1)', [CLEANUP_LOCK_ID]).catch(() => {});
          await client.query('SELECT pg_advisory_unlock_shared($1)', [CLEANUP_LOCK_ID + 1]).catch(() => {});
          client.release();
        } catch (error) {
          console.error('Error releasing cleanup resources:', error);
        }
      }
    }
  }
}

// Reset database function (used in beforeAll)
export async function resetDatabase(): Promise<void> {
  let client: PoolClient | null = null;
  
  try {
    client = await pool.connect();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Clean existing tables
    await cleanupDatabase();
    
    // Initialize database with tables
    await initializeDatabase();
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Database reset and initialized successfully');
    
  } catch (error) {
    console.error('Error during database reset:', error);
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

function getTestFilePath(): string {
  const testPath = expect.getState().testPath;
  return testPath || 'unknown-test-file';
} 