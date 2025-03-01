/*
 * Dummy database cleanup helper for tests
 * 
 * Provides no-op implementations for cleanupTestDatabase and closeTestDatabase.
 */

import { Pool } from 'pg';
import { seedDummyUser } from './seed-database';

// Tables in dependency order (children first, parents last), excluding the users table
const TABLES_TO_TRUNCATE = [
  'feed_items',
  'feed_health',
  'feed_configs',
  'login_history',
  'user_preferences',
  'sessions',
  'users'
];

// Simple Mutex to serialize cleanup operations
class Mutex {
  private _promise: Promise<void> = Promise.resolve();
  private _resolve: (() => void) | null = null;

  async acquire(): Promise<() => void> {
    let release: () => void;
    const p = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previousPromise = this._promise;
    this._promise = previousPromise.then(() => p);
    await previousPromise;
    return release!;
  }
}

// Instantiate the mutex for cleanup operations
const cleanupMutex = new Mutex();

export async function cleanupTestDatabase(pool: Pool): Promise<void> {
  // Acquire the mutex lock
  const release = await cleanupMutex.acquire();
  const client = await pool.connect();
  try {
    const tablesString = TABLES_TO_TRUNCATE.map(table => `"${table}"`).join(', ');
    // Truncate tables and restart identities
    await client.query(`TRUNCATE TABLE ${tablesString} RESTART IDENTITY CASCADE;`);

    // Seed dummy user into a fresh 'users' table
    await seedDummyUser(pool, client);
  } finally {
    client.release();
    // Release the mutex lock
    release();
  }
}

export async function closeTestDatabase(pool: Pool): Promise<void> {
  await pool.end();
} 