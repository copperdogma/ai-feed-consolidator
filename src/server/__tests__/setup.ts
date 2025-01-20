import { beforeAll, afterAll } from 'vitest';
import { config } from 'dotenv';
import pgPromise from 'pg-promise';
import type { IDatabase, IMain } from 'pg-promise';
import type { IClient } from 'pg-promise/typescript/pg-subset';
import { Request } from 'express';
import { User } from '../services/db';
import supertest from 'supertest';
import { SuperAgentTest } from 'supertest';
import express from 'express';

// Load environment variables
config({ path: '.env.test' });

// Set test-specific environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';

// Initialize pg-promise with minimal options
const pgp = pgPromise({
  error(err, e) {
    if (e.cn) {
      console.error('Connection error:', err);
    } else if (e.query) {
      console.error('Query error:', err);
    } else {
      console.error('Generic error:', err);
    }
  }
});

// Create a connection pool with proper settings
export const db = pgp({
  connectionString: process.env.DATABASE_URL,
  max: 10, // maximum number of clients in the pool
  idleTimeoutMillis: 1000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
});

// Constants for cleanup and retries
const CLEANUP_TIMEOUT = 60000; // 60 seconds
const LOCK_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 10; // Increased from 5
const RETRY_DELAY_BASE = 200; // Base delay in milliseconds
const DEADLOCK_ERROR_CODE = '40P01';
const STATEMENT_TIMEOUT_ERROR_CODE = '57014';
const TRANSACTION_ABORTED_ERROR_CODE = '25P02';
const CLEANUP_LOCK_ID = 1000; // Advisory lock ID for cleanup

// Helper function to wait with exponential backoff
async function wait(attempt: number) {
  const delay = Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt - 1), 5000);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Helper function to truncate a single table with retries
async function truncateTable(client: pgPromise.IBaseProtocol<{}>, table: string, attempt: number = 0): Promise<void> {
  try {
    // Start a new transaction for this table
    await client.none('BEGIN');
    
    // Disable triggers temporarily for this transaction
    await client.none('SET LOCAL session_replication_role = replica');
    
    // Attempt to truncate the table
    await client.none('TRUNCATE TABLE $1:name CASCADE', [table]);
    
    // Re-enable triggers
    await client.none('SET LOCAL session_replication_role = origin');
    
    // Commit the transaction
    await client.none('COMMIT');
    console.log(`Successfully cleaned table: ${table}`);
    
  } catch (error: any) {
    console.error(`Error cleaning table ${table}:`, error);
    
    try {
      await client.none('ROLLBACK');
    } catch (rollbackError) {
      console.error(`Error rolling back ${table} cleanup:`, rollbackError);
    }

    if ((error.code === DEADLOCK_ERROR_CODE || 
         error.code === STATEMENT_TIMEOUT_ERROR_CODE ||
         error.code === TRANSACTION_ABORTED_ERROR_CODE) && 
        attempt < MAX_RETRIES - 1) {
      console.log(`Retrying table ${table}, attempt ${attempt + 1}/${MAX_RETRIES}`);
      await wait(attempt);
      return truncateTable(client, table, attempt + 1);
    }
    throw error;
  }
}

// Helper function to create a test user with preferences in a single query
export async function createTestUser(): Promise<User> {
  try {
    const uniqueId = `test-google-id-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    return await db.tx(async t => {
      // Create user and preferences in a single transaction
      const result = await t.one(`
        WITH new_user AS (
          INSERT INTO users (email, google_id, display_name, avatar_url)
          VALUES ($1, $2, $3, $4)
          RETURNING id, email, google_id, display_name, avatar_url
        )
        INSERT INTO user_preferences (user_id, theme, email_notifications, content_language, summary_level)
        SELECT id, 'light', true, 'en', 1 FROM new_user
        RETURNING (SELECT row_to_json(new_user) FROM new_user)
      `, [`test-${uniqueId}@example.com`, uniqueId, 'Test User', 'https://example.com/avatar.jpg']);
      
      return result.row_to_json;
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

// Helper function to initialize a test session
export async function initializeTestSession(app: express.Express, user: User): Promise<ReturnType<typeof supertest.agent>> {
  const agent = supertest.agent(app);

  // Initialize session with retries
  let response;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      response = await agent
        .post('/test/session')
        .send({ user })
        .expect(200);

      if (response.body.success) {
        break;
      }

      console.warn(`Session initialization attempt ${attempt + 1} failed:`, response.body);
      await wait(attempt);
    } catch (error) {
      console.error(`Session initialization attempt ${attempt + 1} error:`, error);
      if (attempt === MAX_RETRIES - 1) throw error;
      await wait(attempt);
    }
  }

  if (!response?.body.success) {
    throw new Error('Session initialization failed after retries');
  }

  // Wait for session to be saved
  await new Promise(resolve => setTimeout(resolve, 250));

  // Verify session is initialized with retries
  let verifyResponse;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      verifyResponse = await agent.get('/protected').expect(200);
      break;
    } catch (error) {
      console.error(`Session verification attempt ${attempt + 1} error:`, error);
      if (attempt === MAX_RETRIES - 1) throw error;
      await wait(attempt);
    }
  }

  if (!verifyResponse) {
    throw new Error('Session verification failed after retries');
  }

  // Log final session state for debugging
  console.debug('Session initialized successfully:', {
    sessionId: response.body.sessionId,
    verifyStatus: verifyResponse.status,
    verifyBody: verifyResponse.body
  });

  return agent;
}

// Clean database after each test
export async function cleanDatabase(): Promise<void> {
  let client: pgPromise.IConnected<{}, any> | null = null;
  let lockAcquired = false;

  try {
    client = await db.connect();
    
    // Try to acquire cleanup lock with retries and longer timeout
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await client.none('SET LOCAL lock_timeout = $1', [LOCK_TIMEOUT * 2]); // Double the lock timeout
        const result = await client.one('SELECT pg_try_advisory_lock($1) as acquired', [CLEANUP_LOCK_ID]);
        if (result.acquired) {
          console.log('Acquired cleanup lock');
          lockAcquired = true;
          break;
        }
        console.log(`Cleanup lock not acquired, attempt ${attempt}/${MAX_RETRIES}`);
        if (attempt < MAX_RETRIES) {
          await wait(attempt);
        }
      } catch (error) {
        console.error('Error acquiring cleanup lock:', error);
        if (attempt < MAX_RETRIES) {
          await wait(attempt);
        }
      }
    }

    if (!lockAcquired) {
      throw new Error(`Failed to acquire cleanup lock after ${MAX_RETRIES} attempts`);
    }

    // Start transaction and set statement timeout
    await client.none('BEGIN');
    await client.none('SET LOCAL statement_timeout = $1', [CLEANUP_TIMEOUT]);
    await client.none('SET LOCAL lock_timeout = $1', [LOCK_TIMEOUT]);
    await client.none('SET LOCAL session_replication_role = replica'); // Disable triggers temporarily

    // Truncate tables in order with individual transactions
    const tables = ['login_history', 'user_preferences', 'sessions', 'users'];
    for (const table of tables) {
      let tableCleanupAttempt = 0;
      let success = false;
      
      while (tableCleanupAttempt < MAX_RETRIES && !success) {
        try {
          // Start a new transaction for each table
          await client.none('SAVEPOINT table_cleanup');
          
          // Try to truncate the table
          await client.none(`TRUNCATE TABLE "${table}" CASCADE`);
          console.log(`Successfully cleaned table: ${table}`);
          
          // Release the savepoint
          await client.none('RELEASE SAVEPOINT table_cleanup');
          success = true;
          
        } catch (error: any) {
          console.error(`Error cleaning table ${table}:`, error);
          
          // Rollback to the savepoint
          try {
            await client.none('ROLLBACK TO SAVEPOINT table_cleanup');
          } catch (rollbackError) {
            console.error(`Error rolling back to savepoint:`, rollbackError);
          }
          
          if ((error.code === DEADLOCK_ERROR_CODE || 
               error.code === STATEMENT_TIMEOUT_ERROR_CODE || 
               error.code === TRANSACTION_ABORTED_ERROR_CODE) && 
              tableCleanupAttempt < MAX_RETRIES - 1) {
            tableCleanupAttempt++;
            await wait(tableCleanupAttempt);
            continue;
          }
          
          throw error;
        }
      }
      
      // Add a small delay between tables to reduce contention
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    await client.none('SET LOCAL session_replication_role = origin'); // Re-enable triggers
    await client.none('COMMIT');
    console.log('Database cleanup successful');

  } catch (error) {
    console.error('Error during database cleanup:', error);
    if (client) {
      try {
        await client.none('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    throw error;
  } finally {
    if (lockAcquired && client) {
      try {
        await client.one('SELECT pg_advisory_unlock($1) as unlocked', [CLEANUP_LOCK_ID]);
        console.log('Released cleanup lock');
      } catch (unlockError) {
        console.error('Error releasing cleanup lock:', unlockError);
      }
    }
    if (client) {
      try {
        await client.done();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

// Clean database before all tests
beforeAll(async () => {
  try {
    await cleanDatabase();
  } catch (error) {
    console.error('Error in beforeAll cleanup:', error);
    throw error;
  }
});

// Clean database after all tests
afterAll(async () => {
  try {
    await cleanDatabase();
    await db.$pool.end(); // Close all connections in the pool
  } catch (error) {
    console.error('Error in afterAll cleanup:', error);
    throw error;
  }
}); 