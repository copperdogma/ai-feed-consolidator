import { logger } from '../logger';
import { IServiceContainer } from './service-container.interface';
import { TransactionManager } from './transaction-manager';
import { IDatabase } from 'pg-promise';

export interface LoginHistory {
  id: number;
  user_id: number | null;
  login_time: Date;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason: string | null;
  request_path: string | null;
}

export class LoginHistoryService {
  private db: IDatabase<any>;
  private transactionManager: TransactionManager;
  private static instance: LoginHistoryService | null = null;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.db = serviceContainer.getPool();
    this.transactionManager = serviceContainer.getService<TransactionManager>('transactionManager');
  }

  public static initialize(serviceContainer: IServiceContainer): void {
    if (!LoginHistoryService.instance) {
      LoginHistoryService.instance = new LoginHistoryService(serviceContainer);
    }
  }

  public static getInstance(serviceContainer: IServiceContainer): LoginHistoryService {
    if (!LoginHistoryService.instance) {
      if (!serviceContainer) {
        throw new Error('LoginHistoryService not initialized');
      }
      LoginHistoryService.instance = new LoginHistoryService(serviceContainer);
    }
    return LoginHistoryService.instance;
  }

  /**
   * Record a login attempt
   */
  async recordLogin(
    userId: number,
    ipAddress: string,
    userAgent: string,
    success: boolean = true,
    failureReason?: string
  ): Promise<void> {
    try {
      await this.db.none(
        `INSERT INTO login_history (
          user_id,
          login_time,
          ip_address,
          user_agent,
          success,
          failure_reason,
          request_path,
          created_at,
          updated_at
        ) VALUES ($1, NOW(), $2, $3, $4, $5, NULL, NOW(), NOW())`,
        [userId, ipAddress, userAgent, success, failureReason]
      );
      logger.info('Login recorded successfully', {
        userId,
        ipAddress,
        success
      });
    } catch (error) {
      logger.error('Failed to record login', {
        userId,
        ipAddress,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorDetails: error
      });
      throw error;
    }
  }

  /**
   * Record a failed login attempt without a user ID
   */
  async recordFailedAttempt(
    ipAddress: string, 
    userAgent: string, 
    failureReason: string, 
    requestPath: string,
    userId?: number
  ): Promise<void> {
    try {
      await this.db.none(
        `INSERT INTO login_history (
          user_id,
          login_time, 
          ip_address, 
          user_agent, 
          success, 
          failure_reason,
          request_path,
          created_at,
          updated_at
        )
        VALUES ($1, NOW(), $2, $3, false, $4, $5, NOW(), NOW())`,
        [userId || null, ipAddress, userAgent, failureReason, requestPath]
      );
      logger.info({ ipAddress, failureReason }, 'Failed login attempt recorded');
    } catch (error) {
      logger.error({ error, ipAddress }, 'Failed to record failed login attempt');
      throw error;
    }
  }

  /**
   * Get login history for a user or IP address
   */
  async getLoginHistory(userId: number): Promise<LoginHistory[]> {
    try {
      logger.debug(`Getting login history for user ${userId}`);
      const result = await this.db.manyOrNone<LoginHistory>(
        `SELECT * FROM login_history 
        WHERE user_id = $1 
        ORDER BY login_time DESC`,
        [userId]
      );
      
      // Ensure we always return an array, even if no results
      return result || [];
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get login history');
      // Return empty array instead of throwing to avoid breaking code that expects an array
      return [];
    }
  }

  /**
   * Get the last login for a user
   */
  async getLastLogin(userId: number): Promise<LoginHistory | null> {
    try {
      const result = await this.db.oneOrNone<LoginHistory>(
        `SELECT * FROM login_history 
         WHERE user_id = $1 
         ORDER BY login_time DESC 
         LIMIT 1`,
        [userId]
      );
      return result || null;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get last login');
      throw error;
    }
  }
}