import { describe, it, expect, beforeEach } from 'vitest';
import { db, cleanDatabase, createTestUser } from './setup';
import type { User } from '../services/db';

describe('Database Cleanup', () => {
  let testUser: User;

  beforeEach(async () => {
    await cleanDatabase(db);
    testUser = await createTestUser();
  });

  it('should properly clean all tables', async () => {
    // First verify we have data
    const beforeCounts = await db.tx(async t => {
      const users = await t.one('SELECT COUNT(*) FROM users');
      const preferences = await t.one('SELECT COUNT(*) FROM user_preferences');
      const sessions = await t.one('SELECT COUNT(*) FROM sessions');
      const loginHistory = await t.one('SELECT COUNT(*) FROM login_history');
      return { users, preferences, sessions, loginHistory };
    });

    // We should have at least one user and their preferences
    expect(Number(beforeCounts.users.count)).toBeGreaterThan(0);
    expect(Number(beforeCounts.preferences.count)).toBeGreaterThan(0);

    // Perform cleanup
    await cleanDatabase(db);

    // Verify all tables are empty
    const afterCounts = await db.tx(async t => {
      const users = await t.one('SELECT COUNT(*) FROM users');
      const preferences = await t.one('SELECT COUNT(*) FROM user_preferences');
      const sessions = await t.one('SELECT COUNT(*) FROM sessions');
      const loginHistory = await t.one('SELECT COUNT(*) FROM login_history');
      return { users, preferences, sessions, loginHistory };
    });

    // All tables should be empty
    expect(Number(afterCounts.users.count)).toBe(0);
    expect(Number(afterCounts.preferences.count)).toBe(0);
    expect(Number(afterCounts.sessions.count)).toBe(0);
    expect(Number(afterCounts.loginHistory.count)).toBe(0);
  });

  it('should maintain data consistency during concurrent operations', async () => {
    // Start a cleanup operation
    const cleanup = cleanDatabase(db);
    
    // Try to create a user during cleanup
    const createUserPromise = createTestUser();
    
    // Wait for both operations to complete
    await Promise.all([cleanup, createUserPromise]);
    
    // Check database state
    const counts = await db.tx(async t => {
      const users = await t.one('SELECT COUNT(*) FROM users');
      const preferences = await t.one('SELECT COUNT(*) FROM user_preferences');
      return { users, preferences };
    });
    
    // We should either have 0 records (if cleanup won) or 1 record (if create won)
    // But we should never have inconsistent state between users and preferences
    expect(Number(counts.users.count)).toBe(Number(counts.preferences.count));
  });

  it('should complete cleanup without causing infinite loops', async () => {
    // Create multiple users to ensure we have data to clean
    await Promise.all([
      createTestUser(),
      createTestUser(),
      createTestUser()
    ]);

    // Track start time
    const startTime = Date.now();
    
    // Perform cleanup
    await cleanDatabase(db);
    
    // Verify cleanup completed within a reasonable time
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Cleanup should take less than 5 seconds
    expect(duration).toBeLessThan(5000);
    
    // Verify database is empty
    const counts = await db.tx(async t => {
      const users = await t.one('SELECT COUNT(*) FROM users');
      return Number(users.count);
    });
    
    expect(counts).toBe(0);
  });
}); 