/**
 * ConnectionPoolManager
 * ====================
 * 
 * This is a singleton class responsible for managing database connection pools
 * across test suites. It implements:
 * 
 * 1. Reference counting for connection pools
 * 2. Health checks before database operations
 * 3. Automatic reconnection for failed connections
 * 4. Graceful pool shutdown
 * 5. Connection error detection and recovery
 * 
 * The purpose of this manager is to solve the recurring connection pool issues
 * in our tests, particularly:
 * - "Connection pool has been destroyed" errors
 * - Database connections being closed prematurely
 * - Multiple test suites competing for the same pool
 * - Lack of proper error handling for connection failures
 */

import { IDatabase, IMain } from 'pg-promise';
import pgPromise from 'pg-promise';
import { logger } from '../../server/logger';
import { config } from 'dotenv';

config({ path: '.env.test' });

// Database connection pool configuration
const MAX_POOL_SIZE = 10;
const IDLE_TIMEOUT = 30000;
const CONNECTION_TIMEOUT = 30000;
const STATEMENT_TIMEOUT = 30000;
const LOCK_TIMEOUT = 10000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

// Class to track connection pool usage by test suites
interface PoolReference {
  db: IDatabase<any>;
  refCount: number;
  pgp: IMain;
  isAlive: boolean;
  lastError?: Error;
  lastUsed: number;
}

export class ConnectionPoolManager {
  private static instance: ConnectionPoolManager | null = null;
  private pools: Map<string, PoolReference> = new Map();
  private isShuttingDown = false;
  private connectionString: string;

  private constructor() {
    this.connectionString = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/ai-feed-test';
    logger.info('ConnectionPoolManager initialized with database URL:', this.connectionString.replace(/:[^:]*@/, ':***@'));
  }

  /**
   * Get the singleton instance of the ConnectionPoolManager
   */
  public static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  /**
   * Acquire a connection pool for a specific test suite
   * @param suiteId Unique identifier for the test suite
   * @returns A database connection pool
   */
  public async acquirePool(suiteId: string): Promise<IDatabase<any>> {
    if (this.isShuttingDown) {
      throw new Error('Cannot acquire pool while system is shutting down');
    }

    // Get existing pool reference or create a new one
    let poolRef = this.pools.get(suiteId);
    
    if (!poolRef || !poolRef.isAlive) {
      if (poolRef) {
        logger.warn(`Pool for suite ${suiteId} is not alive, creating a new one`);
      }
      poolRef = await this.createNewPool(suiteId);
      this.pools.set(suiteId, poolRef);
    }

    // Increment reference count
    poolRef.refCount++;
    poolRef.lastUsed = Date.now();
    
    logger.info(`Pool acquired for suite ${suiteId}, reference count: ${poolRef.refCount}`);
    
    return poolRef.db;
  }

  /**
   * Release a connection pool when a test suite is done with it
   * @param suiteId Unique identifier for the test suite
   */
  public async releasePool(suiteId: string): Promise<void> {
    const poolRef = this.pools.get(suiteId);
    
    if (!poolRef) {
      logger.warn(`Attempted to release non-existent pool for suite ${suiteId}`);
      return;
    }

    // Decrement reference count
    poolRef.refCount--;
    poolRef.lastUsed = Date.now();
    
    logger.info(`Pool released for suite ${suiteId}, reference count: ${poolRef.refCount}`);

    // If reference count reaches zero, consider disposal
    if (poolRef.refCount <= 0) {
      // Keep the pool around for a short time in case it's needed again
      setTimeout(() => {
        this.disposePoolIfUnused(suiteId);
      }, 5000);
    }
  }

  /**
   * Check if a connection pool is still alive and healthy
   * @param suiteId Unique identifier for the test suite
   * @returns True if the pool is alive and can execute queries
   */
  public async isPoolAlive(suiteId: string): Promise<boolean> {
    const poolRef = this.pools.get(suiteId);
    
    if (!poolRef) {
      return false;
    }

    try {
      // Perform a simple query to check connection health
      await poolRef.db.oneOrNone('SELECT 1 AS alive');
      poolRef.isAlive = true;
      return true;
    } catch (error) {
      poolRef.isAlive = false;
      poolRef.lastError = error as Error;
      logger.error(`Pool health check failed for suite ${suiteId}:`, error);
      return false;
    }
  }

  /**
   * Get a connection with health check and auto-reconnect if needed
   * @param suiteId Unique identifier for the test suite
   * @returns A healthy database connection
   */
  public async getHealthyConnection(suiteId: string): Promise<IDatabase<any>> {
    let attempts = 0;
    
    while (attempts < MAX_RECONNECT_ATTEMPTS) {
      const isAlive = await this.isPoolAlive(suiteId);
      
      if (isAlive) {
        return this.pools.get(suiteId)!.db;
      }
      
      // If not alive, try to reconnect
      attempts++;
      logger.warn(`Attempting to reconnect pool for suite ${suiteId}, attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS}`);
      
      try {
        // Dispose the old pool and create a new one
        await this.disposePool(suiteId);
        const poolRef = await this.createNewPool(suiteId);
        this.pools.set(suiteId, poolRef);
        
        // Set the original reference count
        const originalRef = this.pools.get(suiteId)!;
        poolRef.refCount = originalRef.refCount;
        
        logger.info(`Successfully reconnected pool for suite ${suiteId}`);
        return poolRef.db;
      } catch (error) {
        logger.error(`Failed to reconnect pool for suite ${suiteId}, attempt ${attempts}:`, error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY * attempts));
      }
    }
    
    throw new Error(`Failed to get healthy connection for suite ${suiteId} after ${MAX_RECONNECT_ATTEMPTS} attempts`);
  }

  /**
   * Shutdown all connection pools gracefully
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    logger.info(`Shutting down ConnectionPoolManager with ${this.pools.size} active pools`);
    
    // Create an array of promises for each pool shutdown
    const shutdownPromises = Array.from(this.pools.entries()).map(async ([suiteId, poolRef]) => {
      try {
        await this.disposePool(suiteId);
        logger.info(`Pool for suite ${suiteId} shut down successfully`);
      } catch (error) {
        logger.error(`Error shutting down pool for suite ${suiteId}:`, error);
      }
    });
    
    // Wait for all shutdowns to complete
    await Promise.all(shutdownPromises);
    
    this.pools.clear();
    this.isShuttingDown = false;
    
    logger.info('ConnectionPoolManager shutdown completed successfully');
  }

  /**
   * Reset the connection pool manager for testing purposes
   */
  public static resetForTesting(): void {
    if (ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance.shutdown().catch(error => {
        logger.error('Error during ConnectionPoolManager reset:', error);
      });
    }
    
    ConnectionPoolManager.instance = null;
  }

  /**
   * Create a new connection pool
   * @param suiteId Unique identifier for the test suite
   * @returns A new pool reference
   */
  private async createNewPool(suiteId: string): Promise<PoolReference> {
    logger.info(`Creating new database pool for suite ${suiteId}`);
    
    // Create pg-promise instance with proper error handling
    const pgp = pgPromise({
      capSQL: true,
      error: (err, e) => {
        logger.error(`Database error in pool for suite ${suiteId}:`, err);
        if (e.cn) {
          logger.debug('Connection details:', e.cn);
        }
        
        // Mark pool as not alive if a connection error occurs
        const poolRef = this.pools.get(suiteId);
        if (poolRef) {
          poolRef.isAlive = false;
          poolRef.lastError = err;
        }
      }
    });
    
    // Create connection pool with optimized settings
    const db = pgp({
      connectionString: this.connectionString,
      max: MAX_POOL_SIZE,
      idleTimeoutMillis: IDLE_TIMEOUT,
      connectionTimeoutMillis: CONNECTION_TIMEOUT,
      application_name: `test-suite-${suiteId}`
    });
    
    // Test connection and configure settings
    try {
      await db.connect();
      
      // Configure connection settings
      await db.none(`
        SET statement_timeout = ${STATEMENT_TIMEOUT};
        SET lock_timeout = ${LOCK_TIMEOUT};
        SET application_name = 'test-suite-${suiteId}';
      `);
      
      logger.info(`Pool for suite ${suiteId} created and configured successfully`);
    } catch (error) {
      logger.error(`Failed to initialize pool for suite ${suiteId}:`, error);
      throw error;
    }
    
    // Create and return pool reference
    return {
      db,
      pgp,
      refCount: 0,
      isAlive: true,
      lastUsed: Date.now()
    };
  }

  /**
   * Dispose a connection pool if it's no longer in use
   * @param suiteId Unique identifier for the test suite
   */
  private async disposePoolIfUnused(suiteId: string): Promise<void> {
    const poolRef = this.pools.get(suiteId);
    
    if (!poolRef) {
      return;
    }
    
    // Only dispose if reference count is zero and it's been unused for a while
    if (poolRef.refCount <= 0 && (Date.now() - poolRef.lastUsed) > 5000) {
      await this.disposePool(suiteId);
    }
  }

  /**
   * Forcefully dispose a connection pool
   * @param suiteId Unique identifier for the test suite
   */
  private async disposePool(suiteId: string): Promise<void> {
    const poolRef = this.pools.get(suiteId);
    
    if (!poolRef) {
      return;
    }
    
    try {
      // End all connections in the pool
      await poolRef.pgp.end();
      this.pools.delete(suiteId);
      logger.info(`Pool for suite ${suiteId} disposed successfully`);
    } catch (error) {
      logger.error(`Error disposing pool for suite ${suiteId}:`, error);
      // Still remove it from the map even if disposal fails
      this.pools.delete(suiteId);
      throw error;
    }
  }
} 