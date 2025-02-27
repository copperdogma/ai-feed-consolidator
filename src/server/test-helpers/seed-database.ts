/*
 * Seed Database Helper
 * 
 * Inserts a dummy user with ID 1 if not already present.
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../logger';

export async function seedDummyUser(pool: Pool, clientOptional?: PoolClient): Promise<void> {
  const client = clientOptional || await pool.connect();
  try {
    // Insert or update dummy user with ID 1 using UPSERT to avoid duplicate key errors
    await client.query(`
      INSERT INTO users (id, google_id, email, display_name, avatar_url, created_at, updated_at) OVERRIDING SYSTEM VALUE
      VALUES (1, 'dummy_google_id', 'dummy@example.com', 'Dummy User', 'https://example.com/dummy.jpg', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        google_id = EXCLUDED.google_id,
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `);

    // Reset the user sequence so new users will be assigned IDs starting from 2
    await client.query(`ALTER SEQUENCE users_id_seq RESTART WITH 2;`);
  } finally {
    if (!clientOptional) {
      client.release();
    }
  }
}

export async function seedDefaultUsers(pool: Pool): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    const client = await pool.connect();
    try {
      // In test environment, upsert default users using UPSERT to avoid duplicate key errors
      await client.query(`
        INSERT INTO users (id, google_id, email, display_name, avatar_url, password_hash, created_at, updated_at) OVERRIDING SYSTEM VALUE
        VALUES (10001, 'default_google_id', 'default@example.com', 'Default User', 'https://example.com/default.jpg', 'default-hash', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          google_id = EXCLUDED.google_id,
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          password_hash = EXCLUDED.password_hash,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `);

      await client.query(`
        INSERT INTO users (id, google_id, email, display_name, avatar_url, password_hash, created_at, updated_at) OVERRIDING SYSTEM VALUE
        VALUES (10002, 'default_google_id_2', 'default2@example.com', 'Default User 2', 'https://example.com/default2.jpg', 'default-hash-2', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          google_id = EXCLUDED.google_id,
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          password_hash = EXCLUDED.password_hash,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `);

      await client.query(`ALTER SEQUENCE users_id_seq RESTART WITH 10003;`);
    } finally {
      client.release();
    }
    return;
  }

  // Original production logic with advisory locks and retry loop
  const client = await pool.connect();
  await client.query(`SELECT pg_advisory_lock(12345);`);
  try {
    if (process.env.SKIP_USER_SEEDING === 'true') {
      return;
    }
    let attempts = 0;
    const maxAttempts = 3;
    while (true) {
      try {
        await client.query('BEGIN');
        await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;");
        await client.query('LOCK TABLE users IN ACCESS EXCLUSIVE MODE;');

        // Delete existing default users
        await client.query('DELETE FROM users WHERE id IN (10001, 10002);');

        // Insert default user with fixed id 10001
        await client.query(`
          INSERT INTO users (
            id,
            google_id,
            email,
            display_name,
            avatar_url,
            password_hash,
            created_at,
            updated_at
          ) OVERRIDING SYSTEM VALUE
          VALUES (
            10001,
            'default_google_id',
            'default@example.com',
            'Default User',
            'https://example.com/default.jpg',
            'default-hash',
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `);

        // Insert default user with fixed id 10002
        await client.query(`
          INSERT INTO users (
            id,
            google_id,
            email,
            display_name,
            avatar_url,
            password_hash,
            created_at,
            updated_at
          ) OVERRIDING SYSTEM VALUE
          VALUES (
            10002,
            'default_google_id_2',
            'default2@example.com',
            'Default User 2',
            'https://example.com/default2.jpg',
            'default-hash-2',
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `);

        await client.query(`ALTER SEQUENCE users_id_seq RESTART WITH 10003;`);

        await client.query('COMMIT');
        break;
      } catch (error: any) {
        await client.query('ROLLBACK').catch(() => {});
        if (error.code === '40P01' && attempts < maxAttempts) {
          attempts++;
          logger.warn(`Deadlock detected in seedDefaultUsers, retrying attempt ${attempts}/${maxAttempts}...`);
          await new Promise(res => setTimeout(res, 500));
          continue;
        }
        if (error.code === '40P01') {
          logger.error(`Deadlock detection exceeded max attempts (${maxAttempts}) in seedDefaultUsers.`);
        }
        throw error;
      }
    }
  } finally {
    await client.query(`SELECT pg_advisory_unlock(12345);`);
    client.release();
  }
}

export async function seedDefaultFeedConfigs(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Ensure dummy user (ID 1) is present
    await seedDummyUser(pool, client);
    // Insert feed config referencing user 1
    await client.query(`
      INSERT INTO feed_configs (
        user_id,
        feed_url,
        feed_type,
        title,
        created_at,
        updated_at
      )
      VALUES (
        1,
        'https://example.com/feed',
        'rss',
        'Example Feed',
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    // Insert corresponding feed health record
    await client.query(`
      INSERT INTO feed_health (
        feed_config_id,
        consecutive_failures,
        last_check_at,
        created_at,
        updated_at
      )
      VALUES (
        (SELECT id FROM feed_configs WHERE feed_url = 'https://example.com/feed'),
        0,
        NOW(),
        NOW(),
        NOW()
      )
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} 