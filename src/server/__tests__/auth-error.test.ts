import { describe, it, expect, beforeEach } from 'vitest';
import { cleanupDatabase, createTestUser } from './setup';
import { pool } from '../services/db';
import { LoginHistoryService } from '../services/login-history';

describe('Auth Error Handling', () => {
  beforeEach(async () => {
    // Clean database first
    await cleanupDatabase();
    
    // Initialize login history service with db connection
    LoginHistoryService.initialize(pool);
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
    const result = await pool.query('SELECT * FROM login_history');
    const loginHistory = result.rows;
    expect(loginHistory).toHaveLength(1);
    expect(loginHistory[0].success).toBe(false);
    expect(loginHistory[0].ip_address).toBe('127.0.0.1');
    expect(loginHistory[0].user_agent).toBe('test-agent');
    expect(loginHistory[0].user_id).toBeNull();
    expect(loginHistory[0].failure_reason).toBe('Invalid profile data');
  });
}); 