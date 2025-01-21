import { describe, it, expect, beforeEach } from 'vitest';
import { db, cleanDatabase } from './setup';
import { LoginHistoryService } from '../services/login-history';

describe('Auth Error Handling', () => {
  beforeEach(async () => {
    // Clean database first
    await cleanDatabase(db);
    
    // Initialize login history service with db connection
    LoginHistoryService.initialize(db);
  });

  it('should handle failed login attempts without a valid user', async () => {
    // Simulate a failed login attempt
    await LoginHistoryService.recordLoginAttempt({
      userId: null,
      success: false,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      loginTime: new Date(),
      failureReason: 'Invalid profile data'
    });

    // Verify login history was recorded
    const loginHistory = await db.manyOrNone('SELECT * FROM login_history');
    expect(loginHistory).toHaveLength(1);
    expect(loginHistory[0].success).toBe(false);
    expect(loginHistory[0].ip_address).toBe('127.0.0.1');
    expect(loginHistory[0].user_agent).toBe('test-agent');
    expect(loginHistory[0].user_id).toBeNull();
    expect(loginHistory[0].failure_reason).toBe('Invalid profile data');
  });
}); 