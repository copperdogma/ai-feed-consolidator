import { beforeAll, afterAll, expect } from 'vitest';
import { config } from 'dotenv';
import pgPromise from 'pg-promise';
import type { IDatabase, IMain, ITask } from 'pg-promise';
import { Request } from 'express';
import { User } from '../services/db';
import supertest from 'supertest';
import { SuperAgentTest } from 'supertest';
import express from 'express';
import { createApp } from '../app';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config({ path: '.env.test' });

// Set test-specific environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';

// Get current file's directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize pg-promise with custom settings
const pgp: IMain = pgPromise({
  query(e) {
    console.log('QUERY:', e.query);
  }
});

// Create db instance
export const db: IDatabase<any> = pgp(process.env.DATABASE_URL || '');

// Run migrations before any tests
beforeAll(async () => {
  await resetDatabase(db);
});

// Constants for cleanup and retries
const BASE_CLEANUP_LOCK_ID = 41200;
const CLEANUP_TIMEOUT = 120000; // 120 seconds
const LOCK_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// Tables in dependency order (children first)
const TABLES_IN_ORDER = [
  'login_history',     // No dependencies
  'user_preferences',  // Depends on users
  'sessions',         // Depends on users
  'users'            // Parent table
];

// Helper function to wait with exponential backoff and jitter
async function wait(attempt: number): Promise<void> {
  const jitter = Math.random() * RETRY_DELAY_BASE;
  const delay = Math.pow(2, attempt - 1) * RETRY_DELAY_BASE + jitter;
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Create a test user for use in tests
export async function createTestUser(): Promise<User> {
  return db.tx<User>(async (t: ITask<User>) => {
    // Create the user first
    const testUser = await t.one<User>(`
      INSERT INTO users (google_id, email, display_name, avatar_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, ['test-google-id', 'test@example.com', 'Test User', 'https://example.com/picture.jpg']);

    // Then create their preferences
    await t.none(`
      INSERT INTO user_preferences (user_id, theme, email_notifications, content_language, summary_level)
      VALUES ($1, $2, $3, $4, $5)
    `, [testUser.id, 'light', true, 'en', 1]);

    return testUser;
  });
}

// Create an authenticated agent for testing protected routes
export async function createAuthenticatedAgent(): Promise<ReturnType<typeof supertest.agent>> {
  const app = createApp(db);
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

function getCleanupLockId(testFilePath: string): number {
  // Use a hash of the test file path to generate a unique lock ID
  const hash = testFilePath.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return BASE_CLEANUP_LOCK_ID + (Math.abs(hash) % 1000);
}

async function acquireCleanupLock(db: IDatabase<any>, testFilePath: string): Promise<boolean> {
  const lockId = getCleanupLockId(testFilePath);
  return db.one('SELECT pg_try_advisory_lock($1) as acquired', [lockId])
    .then(result => result.acquired);
}

async function releaseCleanupLock(db: IDatabase<any>, testFilePath: string): Promise<void> {
  const lockId = getCleanupLockId(testFilePath);
  // pg_advisory_unlock returns a boolean indicating success
  await db.one('SELECT pg_advisory_unlock($1) as unlocked', [lockId], r => r.unlocked);
}

// Clean the database before tests
export async function cleanDatabase(db: IDatabase<any>, testFilePath?: string): Promise<void> {
  const filePath = testFilePath || getTestFilePath();
  const lockId = getCleanupLockId(filePath);

  // First try to acquire the cleanup lock
  const lockAcquired = await db.one('SELECT pg_try_advisory_lock($1) as acquired', [lockId], r => r.acquired);
  if (!lockAcquired) {
    throw new Error('Could not acquire cleanup lock');
  }

  try {
    await db.tx(async t => {
      // Set aggressive statement timeout
      await t.none('SET statement_timeout = 5000');
      
      // Temporarily disable triggers and foreign key checks
      await t.none('SET session_replication_role = replica');

      // Log start of cleanup
      console.log('Starting database cleanup...');

      // Truncate tables in order (children first)
      for (const table of TABLES_IN_ORDER) {
        try {
          await t.none(`TRUNCATE TABLE "${table}" CASCADE`);
          console.log(`Cleaned table: ${table}`);
        } catch (error: any) {
          if (error?.code === '42P01') { // Table doesn't exist
            console.log(`Table ${table} does not exist, skipping`);
            continue;
          }
          throw error;
        }
      }

      // Re-enable triggers and foreign key checks
      await t.none('SET session_replication_role = default');
      console.log('Database cleanup completed');
    });
  } finally {
    // Always release the lock
    await releaseCleanupLock(db, filePath);
  }
}

// Add after cleanDatabase function
export async function resetDatabase(db: IDatabase<any>, testFilePath?: string): Promise<void> {
  const filePath = testFilePath || getTestFilePath();
  const lockId = getCleanupLockId(filePath);

  // First try to acquire the cleanup lock
  const lockAcquired = await db.one('SELECT pg_try_advisory_lock($1) as acquired', [lockId], r => r.acquired);
  if (!lockAcquired) {
    throw new Error('Could not acquire cleanup lock');
  }

  try {
    // Drop all tables
    await db.none(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Run all migrations
    await runMigrations(db);
  } finally {
    // Always release the lock
    await releaseCleanupLock(db, filePath);
  }
}

// Extract migration running logic to its own function
async function runMigrations(db: IDatabase<any>): Promise<void> {
  try {
    // Create migrations table if it doesn't exist
    await db.none(`
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
    const executedMigrations = await db.map(
      'SELECT name FROM migrations',
      [],
      (row: { name: string }) => row.name
    );
    const executedNames = new Set(executedMigrations);

    // Run pending migrations
    for (const file of sqlFiles) {
      if (!executedNames.has(file)) {
        console.log(`Running migration: ${file}`);
        const filePath = join(migrationsDir, file);
        const sql = await fs.readFile(filePath, 'utf-8');
        console.log(`Migration SQL for ${file}:`, sql);

        await db.tx(async t => {
          await t.none(sql);
          await t.none(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
        });
        console.log(`Completed migration: ${file}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

function getTestFilePath(): string {
  const testPath = expect.getState().testPath;
  return testPath || 'unknown-test-file';
}

afterAll(async () => {
  await db.$pool.end(); // Close all connections in the pool
}); 