/**
 * Global Test Setup Strategy
 * ========================
 * 
 * IMPORTANT: DO NOT MODIFY THIS STRATEGY WITHOUT TEAM DISCUSSION
 * 
 * This file handles the one-time initialization of the test environment.
 * It works in conjunction with setup-test-db.ts to manage the test database lifecycle.
 * 
 * Database Initialization Process:
 * ------------------------------
 * 1. Drop the entire test database if it exists
 * 2. Create a fresh test database
 * 3. Run all migrations ONCE to create schema
 * 4. Initialize connection pool
 * 5. Verify required tables exist
 * 
 * Key Responsibilities:
 * - One-time database setup per test run
 * - Environment variable configuration
 * - Global cleanup hooks
 * - Connection pool management
 * 
 * What this file does NOT do:
 * - Does NOT handle per-test cleanup (see setup-test-db.ts)
 * - Does NOT create test data (use factory functions in tests)
 * - Does NOT manage individual test transactions
 * 
 * This strategy is optimized for:
 * - Fast test execution
 * - Reliable test environment
 * - Proper resource cleanup
 * - Test isolation
 */

import { IDatabase } from 'pg-promise';
import { promisify } from 'util';
import { exec } from 'child_process';
import { Pool } from 'pg';
import { logger } from '../../server/logger';
import { DatabaseStateManager } from './setup-test-db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { TestDataFactory } from './test-data-factory';

const execAsync = promisify(exec);
const dbManager = DatabaseStateManager.getInstance();

// Load test environment variables
config({ path: '.env.test' });

// Generate a unique suite ID for this test run
const suiteId = `test-suite-${Date.now()}`;

beforeAll(async () => {
  const dbManager = DatabaseStateManager.getInstance();
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      // Initialize the database first
      await setup();
      // Then register the test suite
      await dbManager.registerTestSuite(suiteId);
      break;
    } catch (error) {
      retries++;
      logger.error(`Failed to initialize test environment (attempt ${retries}/${maxRetries}):`, error);
      if (retries === maxRetries) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }
}, 60000); // Increased timeout for initialization

// Clean up after each test
afterEach(async () => {
  try {
    await dbManager.cleanDatabase();
  } catch (error) {
    logger.error('Failed to clean database after test:', error);
    // Don't throw here, just log the error
    // This prevents one test's cleanup failure from affecting other tests
  }
});

afterAll(async () => {
  try {
    await dbManager.unregisterTestSuite(suiteId);
    logger.info('Test suite cleanup completed successfully');
  } catch (error) {
    logger.error('Failed to cleanup test suite:', error);
    // Don't throw here as it's the final cleanup
  }
}, 30000);

// Global setup function
export async function setup(): Promise<void> {
  try {
    // Only initialize if not already initialized
    if (!dbManager.isReady()) {
      await ensureCleanDatabase();
      logger.info('Test environment setup completed successfully');
    }
  } catch (error) {
    logger.error('Failed to setup test environment:', error);
    throw error;
  }
}

// Helper function to ensure clean database state
async function ensureCleanDatabase() {
  logger.info('Starting database initialization...');
  
  try {
    // Create a temporary connection to postgres database
    const tempPool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL?.replace('ai-feed-test', 'postgres') || 
                       'postgresql://postgres:postgres@localhost:5433/postgres',
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    });

    try {
      // Drop and recreate test database
      await tempPool.query('DROP DATABASE IF EXISTS "ai-feed-test" WITH (FORCE)');
      await tempPool.query('CREATE DATABASE "ai-feed-test"');
    } finally {
      await tempPool.end().catch(() => {}); // Ignore errors during cleanup
    }

    // Initialize the pool for the test database
    await dbManager.initialize();
    const db = dbManager.getPool();

    // Configure the test database
    await db.task(async t => {
      await t.none(`
        SET statement_timeout = 60000;
        SET lock_timeout = 30000;
        SET idle_in_transaction_session_timeout = 30000;
        SET default_transaction_isolation TO 'READ COMMITTED';
      `);
    });

    // Run migrations and verify tables
    await runMigrations();
    await verifyTables();
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

async function verifyTables() {
  const db = dbManager.getPool();
  const requiredTables = [
    'users',
    'sessions',
    'user_preferences',
    'login_history',
    'feed_configs',
    'feed_items',
    'feed_health',
    'processed_items',
    'item_states'
  ];

  await db.task(async t => {
    interface TableResult {
      table_name: string;
    }
    
    const result = await t.manyOrNone<TableResult>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);
    const existingTables = result.map(row => row.table_name);
    logger.info('Existing tables:', existingTables);
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
    }
    logger.info('All required tables exist');
  });
}

async function runMigrations() {
  const db = dbManager.getPool();
  try {
    // Start transaction
    await db.tx(async t => {
      // Import and execute initial migration
      const migrationPath = join(process.cwd(), 'src', 'server', 'migrations', '20250204000000-initial-schema.cjs');
      logger.info('Running migration from:', migrationPath);
      
      // Clear require cache to ensure fresh migration
      delete require.cache[require.resolve(migrationPath)];
      const migration = require(migrationPath);
      
      // Execute migration with transaction
      await migration.up(t);
      
      interface TableCheck {
        exists: boolean;
      }
      
      // Verify migration success
      const tableCheck = await t.one<TableCheck>(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      if (!tableCheck.exists) {
        throw new Error('Migration failed: users table not created');
      }

      logger.info('Migrations completed successfully');
    });
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
} 