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
import { pool, withTransaction } from '../services/db';

// Load environment variables
config({ path: '.env.test' });

// Set test-specific environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';

// Get current file's directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run migrations before any tests
beforeAll(async () => {
  await resetDatabase();
});

// Constants for cleanup
const CLEANUP_LOCK_ID = 41724;
const RETRY_DELAY_BASE = 1000; // 1 second

// Tables in dependency order (children first, parents last)
const TABLES_IN_ORDER = [
  'login_history',
  'user_preferences',
  'sessions',
  'users'
] as const;

// Helper function to wait with exponential backoff and jitter
async function wait(attempt: number): Promise<void> {
  const delay = Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), 10000);
  const jitter = Math.random() * 100;
  await new Promise(resolve => setTimeout(resolve, delay + jitter));
}

// Create a test user for authentication tests
export async function createTestUser(): Promise<User> {
  try {
    return await withTransaction(async (client: PoolClient) => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');

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

export async function cleanupDatabase() {
  let client: PoolClient | null = null;
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      if (!client) {
        client = await pool.connect();
      }

      // Try to acquire the cleanup lock
      const lockResult = await client.query('SELECT pg_try_advisory_lock($1) as acquired', [CLEANUP_LOCK_ID]);

      if (!lockResult.rows[0].acquired) {
        console.log('Could not acquire cleanup lock, retrying...');
        await client.query('SELECT pg_advisory_lock($1)', [CLEANUP_LOCK_ID]);
      }

      // Start a new transaction
      await client.query('BEGIN');
      
      // Use READ COMMITTED to allow other transactions to proceed
      await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await client.query('SET statement_timeout = 5000'); // 5 seconds
      await client.query('SET session_replication_role = replica'); // Disable triggers and foreign keys

      // Clean each table individually
      for (const table of TABLES_IN_ORDER) {
        try {
          // Lock and clean one table at a time
          await client.query(`LOCK TABLE "${table}" IN ACCESS EXCLUSIVE MODE NOWAIT`);
          await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
          console.log(`Cleaned table: ${table}`);
        } catch (error: any) {
          if (error.code === '55P03') { // Lock not available
            console.log(`Waiting for lock on table: ${table}`);
            await client.query(`LOCK TABLE "${table}" IN ACCESS EXCLUSIVE MODE`);
            await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
            console.log(`Cleaned table: ${table} after waiting`);
          } else if (error.code === '25P02') { // Current transaction is aborted
            console.log('Transaction aborted, rolling back and retrying...');
            await client.query('ROLLBACK');
            throw error; // This will trigger a retry
          } else {
            throw error;
          }
        }
      }

      await client.query('SET session_replication_role = default');
      await client.query('COMMIT');
      console.log('Database cleanup completed successfully');
      return; // Success - exit the retry loop
    } catch (error: any) {
      console.error('Error during cleanup:', error);
      
      if (client) {
        try {
          // Always try to rollback on error
          await client.query('ROLLBACK').catch(() => {});
          
          // If we got a transaction abort, release and get a new client
          if (error.code === '25P02') {
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
          // Release the advisory lock if we have it
          await client.query('SELECT pg_advisory_unlock($1)', [CLEANUP_LOCK_ID]).catch(() => {});
          client.release();
          client = null;
        } catch (error) {
          console.error('Error releasing cleanup resources:', error);
        }
      }
    }
  }
}

// Add after cleanDatabase function
export async function resetDatabase(): Promise<void> {
  const MIGRATION_LOCK_ID = 42000;
  let client: PoolClient | null = null;
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      if (!client) {
        client = await pool.connect();
      }

      // First try to acquire the migration lock
      const lockResult = await client.query('SELECT pg_try_advisory_lock($1) as acquired', [MIGRATION_LOCK_ID]);
      if (!lockResult.rows[0].acquired) {
        console.log('Waiting for migration lock...');
        await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      }

      await client.query('BEGIN');

      // Drop all tables in a single transaction
      await client.query(`
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `);

      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Get list of migration files
      const migrationsDir = join(__dirname, '../../../migrations');
      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

      // Get executed migrations
      const executedMigrations = await client.query('SELECT name FROM migrations');
      const executedNames = new Set(executedMigrations.rows.map(m => m.name));

      // Run pending migrations
      for (const file of sqlFiles) {
        if (!executedNames.has(file)) {
          console.log(`Running migration: ${file}`);
          const filePath = join(migrationsDir, file);
          const sql = await fs.readFile(filePath, 'utf-8');
          console.log(`Migration SQL for ${file}:`, sql);

          await client.query(sql);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          console.log(`Completed migration: ${file}`);
        }
      }

      await client.query('COMMIT');
      console.log('All migrations completed successfully');
      return; // Success - exit the retry loop
    } catch (error) {
      console.error('Error during database reset:', error);
      if (client) {
        await client.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
      }
      
      if (retries < maxRetries - 1) {
        retries++;
        console.log(`Retrying database reset (attempt ${retries + 1}/${maxRetries})...`);
        await wait(retries);
      } else {
        throw error;
      }
    } finally {
      if (client) {
        try {
          // Release the advisory lock if we have it
          await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
          client.release();
          client = null;
        } catch (error) {
          console.error('Error releasing migration resources:', error);
        }
      }
    }
  }
}

function getTestFilePath(): string {
  const testPath = expect.getState().testPath;
  return testPath || 'unknown-test-file';
}

afterAll(async () => {
  await pool.end(); // Close all connections in the pool
}); 