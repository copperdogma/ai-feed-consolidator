import { IDatabase } from 'pg-promise';
import { withTransaction } from './db';
import type { PoolClient } from 'pg';

export interface LoginAttempt {
  userId: number | null;  // Allow null for failed attempts
  success: boolean;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  failureReason?: string;
}

export interface LoginHistoryEntry extends LoginAttempt {
  id: number;
}

export class LoginHistoryService {
  private static db: IDatabase<any>;

  static initialize(database: IDatabase<any>) {
    this.db = database;
  }

  private static async verifyUser(userId: number | null): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Skip verification for null userId (failed attempts)
    if (userId === null) {
      return true;
    }

    try {
      const result = await this.db.oneOrNone('SELECT id FROM users WHERE id = $1', [userId]);
      return !!result;
    } catch (error) {
      console.error('Error verifying user:', error);
      return false;
    }
  }

  static async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Verify user exists before starting transaction (skip for null userId)
    if (attempt.userId !== null) {
      const userExists = await this.verifyUser(attempt.userId);
      if (!userExists) {
        throw new Error(`User with ID ${attempt.userId} not found`);
      }
    }

    try {
      await withTransaction(async (client: PoolClient) => {
        await client.query(`
          INSERT INTO login_history (
            user_id, success, ip_address, user_agent, login_time, failure_reason
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          attempt.userId,
          attempt.success,
          attempt.ipAddress,
          attempt.userAgent,
          attempt.loginTime,
          attempt.failureReason || null
        ]);
      });
    } catch (error) {
      console.error('Error recording login attempt:', error);
      throw error;
    }
  }

  static async getLoginHistory(userId: number, limit: number = 10): Promise<LoginHistoryEntry[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      return await this.db.manyOrNone<LoginHistoryEntry>(`
        SELECT * FROM login_history
        WHERE user_id = $1
        ORDER BY login_time DESC
        LIMIT $2
      `, [userId, limit]);
    } catch (error) {
      console.error('Error getting login history:', error);
      throw error;
    }
  }

  static async getRecentFailedAttempts(userId: number, timeWindow: number = 30): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.one(`
        SELECT COUNT(*) as count
        FROM login_history
        WHERE user_id = $1
          AND success = false
          AND login_time > NOW() - INTERVAL '${timeWindow} minutes'
      `, [userId]);
      return parseInt(result.count);
    } catch (error) {
      console.error('Error getting recent failed attempts:', error);
      throw error;
    }
  }
} 