import { beforeAll, afterAll, expect } from 'vitest';
import { config } from 'dotenv';
import { Request } from 'express';
import { User, getPool, getClient as dbGetClient, withTransaction } from '../services/db';
import supertest from 'supertest';
import { SuperAgentTest } from 'supertest';
import express from 'express';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool, PoolClient } from 'pg';
import { dbManager } from '../../tests/utils/setup-test-db';
import { TestDataFactory } from '../../tests/utils/test-data-factory';
import { vi } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { createApp } from '../app';
import { ServiceContainer, initializeServiceContainer } from '../services/service-container';
import { RSSService } from '../services/rss/rss-service';
import { OpenAIService } from '../services/openai';
import { GoogleAuthService } from '../services/google-auth-service';
import { TransactionManager } from '../services/transaction-manager';
import { IServiceContainer } from '../services/service-container.interface';
import crypto from 'crypto';

// Load environment variables
config({ path: '.env.test' });

// Set test-specific environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-api-key';

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

// Initialize test data factory
let testDataFactory: TestDataFactory;
let app: express.Express;
let testSuiteId: string;

beforeAll(async () => {
  // Generate a unique test suite ID
  testSuiteId = crypto.randomUUID();
  
  // Initialize database and register test suite
  dbManager.registerTestSuite(testSuiteId);
  await dbManager.initialize();
  
  // Initialize test data factory with the database manager's pool
  testDataFactory = await TestDataFactory.initialize(dbManager.getPool());
  
  // Initialize service container with the database manager's pool
  const container = initializeServiceContainer(dbManager.getPool());
  
  // Create the Express app
  app = await createApp();
});

beforeEach(() => {
  // Reset service container and reinitialize with the database manager's pool
  ServiceContainer.resetInstance();
  TransactionManager.resetInstance();
  initializeServiceContainer(dbManager.getPool());
});

afterAll(async () => {
  // Reset test data factory and service container
  TestDataFactory.resetInstance();
  ServiceContainer.resetInstance();
  TransactionManager.resetInstance();
  
  // Unregister test suite
  dbManager.unregisterTestSuite(testSuiteId);
});

// Export for use in tests
export { testDataFactory, app };

// Create a test user for authentication tests
export async function createTestUser(client?: PoolClient): Promise<User> {
  const timestamp = Date.now();
  const email = `test-user-${timestamp}@example.com`;
  const googleId = `test-google-id-${timestamp}`;

  const shouldReleaseClient = !client;
  const queryClient = client || await getPool().connect();

  try {
    // Start a transaction if not already in one
    if (!client) {
      await queryClient.query('BEGIN');
      await queryClient.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    }

    // Create user
    const result = await queryClient.query<User>(`
      INSERT INTO users (
        email,
        google_id,
        display_name,
        created_at,
        updated_at
      ) VALUES (
        $1,
        $2,
        $3,
        NOW(),
        NOW()
      ) RETURNING *
    `, [email, googleId, `Test User ${timestamp}`]);

    const user = result.rows[0];

    // Create default preferences
    await queryClient.query(`
      INSERT INTO user_preferences (
        user_id,
        theme,
        email_notifications,
        content_language,
        summary_level,
        created_at,
        updated_at
      ) VALUES (
        $1,
        'light',
        true,
        'en',
        1,
        NOW(),
        NOW()
      )
    `, [user.id]);

    // Commit the transaction if we started it
    if (!client) {
      await queryClient.query('COMMIT');
    }

    return user;
  } catch (error) {
    // Rollback only if we started the transaction
    if (!client) {
      try {
        await queryClient.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    throw error;
  } finally {
    // Only release if we created the client
    if (shouldReleaseClient) {
      try {
        queryClient.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

// Verify that a test user exists
export async function verifyTestUser(userId: number): Promise<User | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    
    const result = await client.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Create an authenticated agent for testing protected routes
export async function createAuthenticatedAgent(): Promise<ReturnType<typeof supertest.agent>> {
  // Reset and initialize service container
  ServiceContainer.resetInstance();
  TransactionManager.resetInstance();
  initializeServiceContainer(dbManager.getPool());
  
  // Create app with initialized container
  const app = await createApp();
  const agent = supertest.agent(app);
  
  // Create test user and session
  const factory = TestDataFactory.getInstance();
  const { user } = await factory.createAuthTestData();
  
  // Initialize session
  const response = await agent
    .post('/api/auth/session')
    .send({
      passport: {
        user: user.id,
        google_id: user.google_id,
        email: user.email,
        display_name: user.display_name
      }
    });

  if (response.status !== 200) {
    throw new Error(`Failed to authenticate test agent: ${response.status} ${response.text}`);
  }

  return agent;
}

// Cleanup timers after each test
afterEach(() => {
  vi.clearAllTimers();
});

// Utility function to get a new client with retries
async function getClient(maxRetries = 3): Promise<PoolClient> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const client = await getPool().connect();
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
    
    // Initialize database
    await initializeTestDatabase(client);
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

// New cleanupTestDatabase using single TRUNCATE query
export async function cleanupTestDatabase(client: PoolClient): Promise<void> {
  const tables = TABLES_IN_ORDER.map(table => `"${table}"`).join(', ');
  await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
}

function getTestFilePath(): string {
  const testPath = expect.getState().testPath;
  return testPath || 'unknown-test-file';
}

// Utility function for exponential backoff
async function waitWithBackoff(attempt: number): Promise<void> {
  const delay = Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), MAX_DELAY);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Initialize test database
async function initializeTestDatabase(client: PoolClient): Promise<void> {
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    
    // Truncate all tables in order
    for (const table of TABLES_IN_ORDER) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Release advisory lock
async function releaseAdvisoryLock(client: PoolClient, lockId: number): Promise<void> {
  await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
} 