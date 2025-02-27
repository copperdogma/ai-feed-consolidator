import { Pool } from 'pg';
import { IServiceContainer } from './service-container.interface';
import { logger } from '../logger';
import { TransactionManager } from './transaction-manager';
import { PoolClient } from 'pg';

export class DatabaseCleanupService {
  private pool: Pool;
  private static instance: DatabaseCleanupService | null = null;
  private readonly transactionManager: TransactionManager;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = serviceContainer.getPool();
    this.transactionManager = new TransactionManager(serviceContainer);
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.transactionManager.withTransaction(async (client: PoolClient) => {
      const result = await client.query('DELETE FROM sessions WHERE expires_at < NOW()');
      logger.info(`Cleaned up ${result.rowCount} expired sessions`);
    });
  }

  public async cleanupOrphanedRecords(): Promise<void> {
    try {
      await this.transactionManager.withTransaction(async (client) => {
        // Clean up feed_health records without corresponding feed_configs
        await client.query(`
          DELETE FROM feed_health
          WHERE config_id NOT IN (SELECT id FROM feed_configs)
        `);

        // Clean up feed_configs without corresponding users
        await client.query(`
          DELETE FROM feed_configs
          WHERE user_id NOT IN (SELECT id FROM users)
        `);

        logger.info('Cleaned up orphaned records');
      });
    } catch (error) {
      logger.error('Error cleaning up orphaned records:', error);
      throw error;
    }
  }
} 