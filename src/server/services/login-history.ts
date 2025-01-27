import { Pool, PoolClient, QueryResult } from 'pg';
import { withTransaction } from './db';

export interface LoginAttempt {
  userId: number | null;  // Allow null for failed attempts
  success: boolean;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  failureReason?: string;
  requestPath?: string;
}

export interface LoginHistoryEntry {
  id: number;
  userId: number | null;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  failureReason?: string;
  requestPath?: string;
}

export class LoginHistoryService {
  private static pool: Pool;

  static initialize(pool: Pool) {
    this.pool = pool;
  }

  static async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      await withTransaction(async (client: PoolClient) => {
        // Set transaction isolation level and timeout
        await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        await client.query('SET statement_timeout = 30000'); // 30 seconds
        await client.query('SET lock_timeout = 30000'); // 30 seconds

        // For failed attempts, we don't need a user ID
        if (!attempt.success) {
          attempt.userId = null;
        }

        // Only verify user existence for successful logins with a user ID
        if (attempt.success && attempt.userId !== null) {
          const userExists = await client.query(
            'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) as exists',
            [attempt.userId]
          );

          if (!userExists.rows[0].exists) {
            throw new Error(`User with ID ${attempt.userId} not found`);
          }
        }

        // Ensure loginTime is a valid Date
        const loginTime = attempt.loginTime instanceof Date ? attempt.loginTime : new Date(attempt.loginTime);

        // Record the login attempt
        await client.query(`
          INSERT INTO login_history (
            user_id, success, ip_address, user_agent, login_time, failure_reason, request_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          attempt.userId,
          attempt.success,
          attempt.ipAddress,
          attempt.userAgent,
          loginTime.toISOString(),
          attempt.failureReason || null,
          attempt.requestPath || null
        ]);
      });
    } catch (error) {
      console.error('Error recording login attempt:', error);
      throw error;
    }
  }

  static async getLoginHistory(userId: number, limit: number = 10): Promise<LoginHistoryEntry[]> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      return await withTransaction(async (client: PoolClient) => {
        // Set transaction isolation level and timeout
        await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await client.query('SET statement_timeout = 30000'); // 30 seconds
        await client.query('SET lock_timeout = 30000'); // 30 seconds

        // Verify user exists
        const userExists = await client.query(
          'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) as exists',
          [userId]
        );

        if (!userExists.rows[0].exists) {
          return []; // Return empty array if user doesn't exist
        }

        // Get login history for both successful and failed attempts
        const result = await client.query<LoginHistoryEntry>(`
          SELECT 
            id,
            user_id as "userId",
            success,
            ip_address as "ipAddress",
            user_agent as "userAgent",
            login_time as "loginTime",
            failure_reason as "failureReason",
            request_path as "requestPath"
          FROM login_history
          WHERE user_id = $1 OR (user_id IS NULL AND ip_address = (
            SELECT ip_address FROM login_history WHERE user_id = $1 ORDER BY login_time DESC LIMIT 1
          ))
          ORDER BY login_time DESC
          LIMIT $2
        `, [userId, limit]);

        return result.rows.map(row => ({
          ...row,
          loginTime: new Date(row.loginTime)
        }));
      });
    } catch (error) {
      console.error('Error getting login history:', error);
      throw error;
    }
  }

  static async getRecentFailedAttempts(userId: number, timeWindow: number = 30): Promise<number> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      return await withTransaction(async (client: PoolClient) => {
        await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');

        // First verify that the user exists
        const userExists = await client.query(
          'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)',
          [userId]
        );

        if (!userExists.rows[0].exists) {
          throw new Error(`User with ID ${userId} not found`);
        }

        // Get failed attempts count for both user-specific and anonymous attempts
        const result = await client.query<{ count: string }>(`
          SELECT COUNT(*) as count
          FROM login_history
          WHERE success = false
            AND (
              -- Include failed attempts for this specific user
              (user_id = $1 AND success = false)
              -- Include anonymous failed attempts
              OR (user_id IS NULL AND success = false)
            )
            AND login_time > NOW() - INTERVAL '${timeWindow} minutes'
        `, [userId]);

        return parseInt(result.rows[0].count, 10);
      });
    } catch (error) {
      console.error('Error counting recent failed attempts:', error);
      throw error;
    }
  }
} 