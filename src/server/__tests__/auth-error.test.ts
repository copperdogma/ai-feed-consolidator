import { describe, it, expect, beforeEach } from 'vitest';
import { db, cleanDatabase } from './setup';
import { LoginHistoryService } from '../services/login-history';
import { Request } from 'express';
import passport from '../middleware/auth';

describe('Auth Error Handling', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should handle failed login attempts without a valid user', async () => {
    const mockReq = {
      loginAttempt: {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      }
    } as Request;

    // Simulate a failed OAuth callback
    const strategy = passport._strategies['google'];
    const verify = strategy._verify;

    // Call verify with invalid profile data
    await expect(
      new Promise((resolve, reject) => {
        verify(
          mockReq,
          'invalid-token',
          'refresh-token',
          { id: 'invalid' }, // Invalid profile
          (error: any, user: any) => {
            if (error) reject(error);
            else resolve(user);
          }
        );
      })
    ).rejects.toThrow();

    // Verify no login history entries were created for invalid user
    const loginHistory = await db.any('SELECT * FROM login_history');
    expect(loginHistory).toHaveLength(0);
  });
}); 