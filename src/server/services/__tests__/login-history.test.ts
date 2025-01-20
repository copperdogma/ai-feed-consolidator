import { describe, it, expect, beforeEach } from 'vitest';
import { LoginHistoryService } from '../login-history';
import { cleanDatabase, createTestUser, db } from '../../__tests__/setup';

describe('LoginHistoryService', () => {
  let testUser: { id: number };

  beforeEach(async () => {
    await cleanDatabase();
    testUser = await createTestUser();
    
    // Verify the user was created successfully
    const verifyUser = await db.one('SELECT * FROM users WHERE id = $1', [testUser.id]);
    expect(verifyUser).toBeTruthy();
    expect(verifyUser.id).toBe(testUser.id);
    
    LoginHistoryService.initialize(db);
  });

  it('should record login attempts', async () => {
    // Record a successful login attempt
    await LoginHistoryService.recordLoginAttempt({
      userId: testUser.id,
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      loginTime: new Date()
    });

    // Record a failed login attempt
    await LoginHistoryService.recordLoginAttempt({
      userId: testUser.id,
      success: false,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      loginTime: new Date()
    });

    const history = await LoginHistoryService.getLoginHistory(testUser.id);
    expect(history).toHaveLength(2);
    expect(history[0].success).toBe(false);
    expect(history[1].success).toBe(true);
  });

  it('should respect the limit parameter when getting login history', async () => {
    // Create multiple login attempts
    for (let i = 0; i < 5; i++) {
      await LoginHistoryService.recordLoginAttempt({
        userId: testUser.id,
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        loginTime: new Date()
      });
    }

    const history = await LoginHistoryService.getLoginHistory(testUser.id, 3);
    expect(history).toHaveLength(3);
  });

  it('should count recent failed attempts correctly', async () => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Add some failed attempts
    await LoginHistoryService.recordLoginAttempt({
      userId: testUser.id,
      success: false,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      loginTime: now
    });

    await LoginHistoryService.recordLoginAttempt({
      userId: testUser.id,
      success: false,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      loginTime: now
    });

    // Add an old failed attempt that shouldn't be counted
    await LoginHistoryService.recordLoginAttempt({
      userId: testUser.id,
      success: false,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      loginTime: hourAgo
    });

    const recentFailures = await LoginHistoryService.getRecentFailedAttempts(testUser.id);
    expect(recentFailures).toBe(2);
  });
}); 