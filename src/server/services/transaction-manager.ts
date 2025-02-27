import { Pool, PoolClient } from 'pg';
import { logger } from '../logger';
import { IServiceContainer } from './service-container.interface';
import { poolManager } from '../../tests/utils/enhanced-pool-manager';
import { IDatabase } from 'pg-promise';

interface TransactionOptions {
  maxRetries?: number;
  statementTimeout?: number;
  lockTimeout?: number;
  isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  forceSerial?: boolean;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<TransactionOptions> = {
  maxRetries: 10,
  statementTimeout: 60000, // 60 seconds
  lockTimeout: 30000, // 30 seconds
  isolationLevel: 'READ COMMITTED',
  readOnly: false,
  forceSerial: false,
  retryDelay: 200 // 200ms initial delay
};

interface PostgresError extends Error {
  code?: string;
}

export class TransactionManager {
  private static instance: TransactionManager | null = null;
  private container: IServiceContainer;
  private pool: Pool;
  private activeTransactions = new Map<PoolClient, number>();

  private constructor(container: IServiceContainer) {
    this.container = container;
    this.pool = container.getService('pool');
  }

  public static getInstance(container: IServiceContainer): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager(container);
    }
    return TransactionManager.instance;
  }

  public static resetInstance(): void {
    TransactionManager.instance = null;
  }

  private async setupTransaction(client: PoolClient, options: Required<TransactionOptions>): Promise<void> {
    // Set statement and lock timeouts
    await client.query(`SET statement_timeout = ${options.statementTimeout}`);
    await client.query(`SET lock_timeout = ${options.lockTimeout}`);

    // Set isolation level
    await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);

    // Set read-only mode if specified
    if (options.readOnly) {
      await client.query('SET TRANSACTION READ ONLY');
    }

    // Set serializable mode if forced
    if (options.forceSerial && options.isolationLevel !== 'SERIALIZABLE') {
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    }
  }

  /**
   * Execute a read-only transaction with READ COMMITTED isolation level
   */
  async withReadTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: Omit<TransactionOptions, 'readOnly' | 'isolationLevel'> = {}
  ): Promise<T> {
    return this.withTransaction(callback, {
      ...options,
      readOnly: true,
      isolationLevel: 'READ COMMITTED'
    });
  }

  /**
   * Execute a write transaction with specified isolation level
   */
  async withWriteTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: Omit<TransactionOptions, 'readOnly'> = {}
  ): Promise<T> {
    return this.withTransaction(callback, {
      ...options,
      readOnly: false
    });
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const fullOptions = { ...DEFAULT_OPTIONS, ...options };
    let client: PoolClient | null = null;
    let retries = 0;

    while (retries <= fullOptions.maxRetries) {
      try {
        // In test environment, use enhanced pool manager
        if (process.env.NODE_ENV === 'test') {
          client = await poolManager.acquireConnection();
          await poolManager.beginTransaction(client);
        } else {
          // Get a client from the regular pool
          client = await this.pool.connect();
        }
        
        this.activeTransactions.set(client, (this.activeTransactions.get(client) || 0) + 1);

        // Set up transaction options
        await this.setupTransaction(client, fullOptions);
        
        // Start transaction if not using enhanced pool manager
        if (process.env.NODE_ENV !== 'test') {
          await client.query('BEGIN');
        }

        // Execute callback
        const result = await callback(client);
        
        // Commit transaction
        if (process.env.NODE_ENV === 'test') {
          await poolManager.commitTransaction(client);
        } else {
          await client.query('COMMIT');
        }
        
        return result;
      } catch (error) {
        // Rollback on error
        if (client) {
          try {
            if (process.env.NODE_ENV === 'test') {
              await poolManager.rollbackTransaction(client);
            } else {
              await client.query('ROLLBACK');
            }
          } catch (rollbackError) {
            logger.error('Error during rollback:', rollbackError);
          }
        }

        // Check if we should retry
        const pgError = error as PostgresError;
        const isDeadlockError = pgError.code === '40P01';
        const isSerializationError = pgError.code === '40001';
        const shouldRetry = (isDeadlockError || isSerializationError) && retries < fullOptions.maxRetries;

        if (shouldRetry) {
          retries++;
          const delay = fullOptions.retryDelay * Math.pow(2, retries);
          logger.warn(`Retrying transaction after ${delay}ms (attempt ${retries}/${fullOptions.maxRetries})`, {
            error: pgError,
            retries,
            options: fullOptions
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Log transaction error
        logger.error('Transaction error', {
          error: pgError,
          retries,
          options: fullOptions
        });

        throw error;
      } finally {
        if (client) {
          // Unregister transaction
          const count = this.activeTransactions.get(client);
          if (count && count > 1) {
            this.activeTransactions.set(client, count - 1);
          } else {
            this.activeTransactions.delete(client);
          }

          // Release client
          client.release();
        }
      }
    }

    throw new Error(`Transaction failed after ${fullOptions.maxRetries} retries`);
  }

  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }
} 