import { describe, it, expect, beforeEach } from 'vitest';
import { LoginHistoryService } from '../login-history';
import { pool } from '../db';
import { cleanupDatabase, createTestUser } from '../../__tests__/setup';
import { User } from '../db';

describe('LoginHistoryService', () => {
  let testUser: User;

  beforeEach(async () => {
    await cleanupDatabase();
    LoginHistoryService.initialize(pool);
    testUser = await createTestUser();
  });

  it('should record login attempts', async () => {
    const attempt = {
      userId: testUser.id,
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      loginTime: new Date()
    };

    await LoginHistoryService.recordLoginAttempt(attempt);

    const result = await pool.query('SELECT * FROM login_history WHERE user_id = $1', [testUser.id]);
    const history = result.rows;
    expect(history).toHaveLength(1);
    expect(history[0].success).toBe(true);
    expect(history[0].ip_address).toBe('127.0.0.1');
  });

  it('should respect the limit parameter when getting login history', async () => {
    // Create multiple login attempts
    const attempts = Array.from({ length: 5 }, (_, i) => ({
      userId: testUser.id,
      success: i % 2 === 0,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      loginTime: new Date(Date.now() - i * 60000), // Each attempt 1 minute apart
      failureReason: i % 2 === 0 ? undefined : 'test failure'
    }));

    for (const attempt of attempts) {
      await LoginHistoryService.recordLoginAttempt(attempt);
    }

    const history = await LoginHistoryService.getLoginHistory(testUser.id, 3);
    expect(history).toHaveLength(3);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].loginTime instanceof Date).toBe(true);
    if (history.length > 1) {
      expect(history[0].loginTime.getTime()).toBeGreaterThan(history[1].loginTime.getTime());
    }
  });

  it('should count recent failed attempts correctly', async () => {
    const now = new Date();
    const attempts = [
      {
        userId: null,
        success: false,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        loginTime: new Date(now.getTime() - 15 * 60000), // 15 minutes ago
        failureReason: 'test failure'
      },
      {
        userId: null,
        success: false,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        loginTime: new Date(now.getTime() - 10 * 60000), // 10 minutes ago
        failureReason: 'test failure'
      },
      {
        userId: testUser.id,
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        loginTime: new Date(now.getTime() - 5 * 60000) // 5 minutes ago
      }
    ];

    for (const attempt of attempts) {
      await LoginHistoryService.recordLoginAttempt(attempt);
    }

    const failedCount = await LoginHistoryService.getRecentFailedAttempts(testUser.id, 30);
    expect(failedCount).toBe(2);
  });
}); 