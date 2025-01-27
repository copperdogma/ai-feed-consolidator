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
const RESET_LOCK_ID = 41725;
const MAX_RETRIES = 10;  // Increased from 5
const RETRY_DELAY_BASE = 200;  // Increased from 100
const MAX_DELAY = 5000;  // Increased from 2000
const STATEMENT_TIMEOUT = 5000; // Increased from 2s to 5s

// Tables in dependency order (children first, parents last)
const TABLES_IN_ORDER = [
  'login_history',
  'user_preferences',
  'sessions',
  'users'
] as const;

// Helper function to acquire an advisory lock
async function acquireAdvisoryLock(client: PoolClient, lockId: number): Promise<boolean> {
  const result = await client.query('SELECT pg_try_advisory_lock($1)', [lockId]);
  return result.rows[0].pg_try_advisory_lock;
}

// Helper function to release an advisory lock
async function releaseAdvisoryLock(client: PoolClient, lockId: number): Promise<void> {
  await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
}

// Helper function to wait with exponential backoff and jitter
async function waitWithBackoff(attempt: number): Promise<void> {
  const delay = Math.min(
    RETRY_DELAY_BASE * Math.pow(2, attempt) + Math.random() * 1000,
    MAX_DELAY
  );
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Track if database has been initialized
let isDatabaseInitialized = false;

// Run migrations before any tests
beforeAll(async () => {
  if (!isDatabaseInitialized) {
    await resetDatabase();
    isDatabaseInitialized = true;
  }
  // Initialize LoginHistoryService
  const { LoginHistoryService } = await import('../services/login-history');
  LoginHistoryService.initialize(pool);
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
  let client: PoolClient | null = null;
  let retries = 0;
  const maxRetries = 3;
  const testGoogleId = `test-google-id-${Date.now()}`;

  while (retries < maxRetries) {
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');

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
        [testGoogleId, 'test@example.com', 'Test User', 'https://example.com/picture.jpg']
      );

      const user = result.rows[0];
      console.log('Created test user:', user);

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

      // Verify the user exists in this transaction
      const verifyResult = await client.query<User>('SELECT * FROM users WHERE id = $1', [user.id]);
      if (verifyResult.rows.length === 0) {
        throw new Error(`Test user ${user.id} was not created successfully`);
      }
      console.log('Verified test user exists:', verifyResult.rows[0]);

      await client.query('COMMIT');
      return user;

    } catch (error) {
      console.error(`Error creating test user (attempt ${retries + 1}/${maxRetries}):`, error);
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      if (retries < maxRetries - 1) {
        retries++;
        await waitWithBackoff(retries);
      } else {
        throw error;
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  throw new Error(`Failed to create test user after ${maxRetries} attempts`);
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
  const app = await createApp();
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

// Utility function to get a new client with retries
async function getClient(maxRetries = 3): Promise<PoolClient> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      return client;
    } catch (error) {
      console.error(`Failed to get client (attempt ${retries + 1}/${maxRetries}):`, error);
      retries++;
      if (retries === maxRetries) {
        throw error;
      }
      await waitWithBackoff(retries);
    }
  }
  throw new Error('Failed to get client after max retries');
}

// Helper function to acquire an advisory lock with retries
async function acquireAdvisoryLockWithRetries(
  client: PoolClient,
  lockId: number
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await client.query(
      'SELECT pg_try_advisory_lock($1) as acquired',
      [lockId]
    );
    
    if (result.rows[0].acquired) {
      console.log(`Successfully acquired lock ${lockId} on attempt ${attempt + 1}`);
      return true;
    }

    console.log(`Failed to acquire lock ${lockId}, attempt ${attempt + 1}/${MAX_RETRIES}, waiting before retry...`);
    await waitWithBackoff(attempt);
  }

  return false;
}

// Reset database function (used in beforeAll)
export async function resetDatabase(): Promise<void> {
  let client: PoolClient | null = null;
  let lockAcquired = false;
  
  try {
    // Get a new client
    client = await getClient();
    
    // Set longer timeouts for schema operations
    await client.query('SET statement_timeout = 300000'); // 5 minutes
    await client.query('SET lock_timeout = 300000'); // 5 minutes
    await client.query('SET idle_in_transaction_session_timeout = 300000'); // 5 minutes
    
    // Try to acquire the reset lock with retries
    console.log('Attempting to acquire reset lock...');
    lockAcquired = await acquireAdvisoryLockWithRetries(client, RESET_LOCK_ID);
    if (!lockAcquired) {
      throw new Error('Failed to acquire reset lock after retries');
    }
    
    // Clean tables one at a time without a transaction
    for (const table of TABLES_IN_ORDER) {
      try {
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
        console.log(`Cleaned table: ${table}`);
      } catch (error) {
        console.error(`Error cleaning table ${table}:`, error);
        throw error;
      }
    }
    
    // Initialize database with tables
    await initializeDatabase();
    console.log('Database reset completed successfully');
    
  } catch (error) {
    console.error(`Error during database reset:`, error);
    throw error;
  } finally {
    // Release lock if we acquired it
    if (client && lockAcquired) {
      try {
        await releaseAdvisoryLock(client, RESET_LOCK_ID);
        console.log('Released reset lock');
      } catch (error) {
        console.error('Error releasing reset lock:', error);
      }
    }
    
    // Release client if we have one
    if (client) {
      try {
        client.release();
        console.log('Released database client');
      } catch (error) {
        console.error('Error releasing client:', error);
      }
      client = null;
    }
  }
}

// Cleanup database function (used in beforeEach)
export async function cleanupDatabase(): Promise<void> {
  let client: PoolClient | null = null;
  let lockAcquired = false;
  
  try {
    // Get a new client
    client = await getClient();
    
    // Set longer timeouts for schema operations
    await client.query('SET statement_timeout = 300000'); // 5 minutes
    await client.query('SET lock_timeout = 300000'); // 5 minutes
    await client.query('SET idle_in_transaction_session_timeout = 300000'); // 5 minutes
    
    // Try to acquire the cleanup lock with retries
    console.log('Attempting to acquire cleanup lock...');
    lockAcquired = await acquireAdvisoryLockWithRetries(client, CLEANUP_LOCK_ID);
    if (!lockAcquired) {
      throw new Error('Failed to acquire cleanup lock after retries');
    }
    
    // Clean tables one at a time without a transaction
    for (const table of TABLES_IN_ORDER) {
      try {
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
        console.log(`Cleaned table: ${table}`);
      } catch (error) {
        console.error(`Error cleaning table ${table}:`, error);
        throw error;
      }
    }
    
    await client.query('DELETE FROM feed_items');
    await client.query('DELETE FROM feed_configs');
    
    console.log('Database cleanup completed successfully');
    
  } catch (error) {
    console.error(`Error during database cleanup:`, error);
    throw error;
  } finally {
    // Release lock if we acquired it
    if (client && lockAcquired) {
      try {
        await releaseAdvisoryLock(client, CLEANUP_LOCK_ID);
        console.log('Released cleanup lock');
      } catch (error) {
        console.error('Error releasing cleanup lock:', error);
      }
    }
    
    // Release client if we have one
    if (client) {
      try {
        client.release();
        console.log('Released database client');
      } catch (error) {
        console.error('Error releasing client:', error);
      }
      client = null;
    }
  }
}

function getTestFilePath(): string {
  const testPath = expect.getState().testPath;
  return testPath || 'unknown-test-file';
} 