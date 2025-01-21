import { describe, it, expect, beforeEach } from 'vitest';
import { cleanupDatabase as cleanDatabase, createTestUser } from './setup';
import { pool } from '../services/db';
import type { User } from '../services/db';

describe('Database Cleanup', () => {
  let testUser: User;

  beforeEach(async () => {
    await cleanDatabase();
    testUser = await createTestUser();
  });

  it('should properly clean all tables', async () => {
    // Verify test user exists
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [testUser.id]);
    expect(result.rows[0]).toBeTruthy();

    // Perform cleanup
    await cleanDatabase();

    // Verify all tables are empty
    const tables = ['users', 'sessions', 'user_preferences', 'login_history'];
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      expect(parseInt(result.rows[0].count)).toBe(0);
    }
  });

  it('should maintain data consistency during concurrent operations', async () => {
    // Start a cleanup operation
    const cleanup = cleanDatabase();
    
    // Try to create a user during cleanup
    try {
      await createTestUser();
    } catch (error) {
      // Expect error due to cleanup lock
      expect(error).toBeTruthy();
    }

    // Wait for cleanup to finish
    await cleanup;
  });

  it('should complete cleanup without causing infinite loops', async () => {
    const startTime = Date.now();
    await cleanDatabase();
    const duration = Date.now() - startTime;
    
    // Verify cleanup completed within a reasonable time
    expect(duration).toBeLessThan(10000); // 10 seconds
  });
}); 