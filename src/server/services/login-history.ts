import { IDatabase } from 'pg-promise';
import { withTransaction } from './db';
import type { IClient } from 'pg-promise/typescript/pg-subset';

export interface LoginAttempt {
  userId: number;
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

  private static async verifyUser(userId: number): Promise<boolean> {
    return withTransaction(async (client) => {
      const result = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      return (result.rowCount ?? 0) > 0;
    });
  }

  static async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await withTransaction(async (client) => {
        // Verify user exists before recording attempt
        if (!(await this.verifyUser(attempt.userId))) {
          throw new Error(`User with ID ${attempt.userId} not found`);
        }

        await client.query(`
          INSERT INTO login_history (
            user_id, success, ip_address, user_agent, login_time, failure_reason
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          )
        `, [
          attempt.userId,
          attempt.success,
          attempt.ipAddress,
          attempt.userAgent,
          attempt.loginTime,
          attempt.failureReason
        ]);
      });
    } catch (error) {
      console.error('Error recording login attempt:', error);
      throw error;
    }
  }

  static async getLoginHistory(userId: number, limit?: number): Promise<LoginHistoryEntry[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      return await withTransaction(async (client) => {
        if (!(await this.verifyUser(userId))) {
          throw new Error(`User with ID ${userId} not found`);
        }

        const query = `
          SELECT * FROM login_history 
          WHERE user_id = $1 
          ORDER BY login_time DESC
          ${limit ? 'LIMIT $2' : ''}
        `;
        const params = limit ? [userId, limit] : [userId];
        
        const result = await client.query<LoginHistoryEntry>(query, params);
        return result.rows;
      });
    } catch (error) {
      console.error('Error getting login history:', error);
      throw error;
    }
  }

  static async getRecentFailedAttempts(userId: number): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      return await withTransaction(async (client) => {
        if (!(await this.verifyUser(userId))) {
          throw new Error(`User with ID ${userId} not found`);
        }

        const result = await client.query(`
          SELECT COUNT(*) as count 
          FROM login_history 
          WHERE user_id = $1 
          AND success = false 
          AND login_time > NOW() - INTERVAL '1 hour'
        `, [userId]);
        
        return parseInt(result.rows[0].count);
      });
    } catch (error) {
      console.error('Error counting recent failed attempts:', error);
      throw error;
    }
  }
} 