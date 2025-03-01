/**
 * Test Database Setup Strategy
 * ========================
 * 
 * IMPORTANT: DO NOT MODIFY THIS STRATEGY WITHOUT TEAM DISCUSSION
 * 
 * This file establishes the test database setup, cleanup, and lifecycle management.
 * 
 * Test Database Lifecycle:
 * 1. Global Initialization (once per test suite):
 *    - Drop and recreate the test database (handled by global-setup.ts)
 *    - Run migrations to establish schema (handled by global-setup.ts)
 *    - Initialize connection pool
 * 
 * 2. Per-Test Cleanup:
 *    - TRUNCATE tables (not DROP - this is critical for performance)
 *    - Maintain foreign key constraints (don't disable/re-enable)
 *    - Reset sequences
 *    - Use transactions for atomicity
 * 
 * 3. Test Data:
 *    - Each test is responsible for its own data setup
 *    - Use factory functions to create test data consistently
 * 
 * Key Points:
 *  - NEVER drop/recreate tables between tests (use TRUNCATE)
 *  - NEVER re-run migrations between tests
 *  - Maintain foreign key constraints always
 *  - Use factory functions for test data
 */

import pgPromise, { IDatabase } from 'pg-promise';
import { Pool } from 'pg';
import { logger } from '../../server/logger';
import { EnhancedPoolManager } from './enhanced-pool-manager';
import crypto from 'crypto';
import { ServiceContainer } from '../../server/services/service-container';

// Constants
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 500;
export const TEST_TIMEOUT_MS = 60000; // 60 seconds timeout for tests
export const SHUTDOWN_TIMEOUT_MS = 30000; // 30 seconds for shutdown operations
export const DB_STATEMENT_TIMEOUT = 30000; // 30 seconds statement timeout

// Database shutdown and initialization flags
let isInitializing = false;
let isShuttingDown = false;
let initializePromise: Promise<void> | null = null;

// Database connection options
interface ConnectionOptions {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  application_name?: string;
}

// Helper function to retry an operation with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  description: string,
  maxRetries = MAX_RETRY_ATTEMPTS,
  delayMs = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      logger.warn(
        `Attempt ${attempt}/${maxRetries} for ${description} failed: ${error.message}`
      );
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(
    `Operation "${description}" failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}

// Helper function to initialize the database with retry
export async function initializeDatabaseWithRetry(): Promise<IDatabase<any>> {
  return withRetry(
    async () => {
      // Get or create database manager
      const dbManager = DatabaseStateManager.getInstance();
      
      // If we're already initialized, just return the pool
      if (dbManager.isReady()) {
        return dbManager.getPool();
      }
      
      // Otherwise initialize
      await dbManager.initialize();
      return dbManager.getPool();
    },
    'initialize database with retry',
    3,
    1000
  );
}

// Helper function to truncate all tables
export async function truncateAllTables(db: IDatabase<any>): Promise<void> {
  return withRetry(
    async () => {
      await db.tx(async t => {
        // Use a transaction for atomicity
        await t.none(`
          DO $$
          DECLARE
            table_name text;
          BEGIN
            FOR table_name IN 
              SELECT tablename FROM pg_tables 
              WHERE schemaname = 'public' AND 
                    tablename != 'migrations' AND
                    tablename != 'pg_stat_statements'
            LOOP
              EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
            END LOOP;
          END $$;
        `);
      });
    },
    'truncate all tables',
    3,
    500
  );
}

// Helper function to reset sequences
export async function resetSequences(db: IDatabase<any>): Promise<void> {
  return withRetry(
    async () => {
      await db.tx(async t => {
        await t.none(`
          DO $$
          DECLARE
            seq_name text;
          BEGIN
            FOR seq_name IN 
              SELECT relname FROM pg_class 
              WHERE relkind = 'S'
            LOOP
              EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq_name);
            END LOOP;
          END $$;
        `);
      });
    },
    'reset sequences',
    3,
    500
  );
}

/**
 * Database State Manager
 * 
 * Manages the lifecycle of the database connection pool for tests.
 * Ensures that the database is properly initialized and cleaned up.
 */
export class DatabaseStateManager {
  private static instance: DatabaseStateManager | null = null;
  private pool: IDatabase<any> | null = null;
  private poolManager: EnhancedPoolManager;
  private initialized = false;
  private isPoolSafeForReuse = false;
  private isShuttingDown = false;
  private connectionOptions: ConnectionOptions;
  private activeSuites = new Set<string>();
  private activeConnections = new Map<string, IDatabase<any>>();
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.poolManager = EnhancedPoolManager.getInstance();
    this.connectionOptions = this.getConnectionOptions();
  }
  
  /**
   * Get the connection options for the database
   */
  private getConnectionOptions(): ConnectionOptions {
    return {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
      database: process.env.TEST_DATABASE_NAME || 'ai-feed-test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 5000, // How long to wait for a connection
      application_name: 'ai-feed-test'
    };
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DatabaseStateManager {
    if (!DatabaseStateManager.instance) {
      DatabaseStateManager.instance = new DatabaseStateManager();
    }
    return DatabaseStateManager.instance;
  }
  
  /**
   * Initialize the database state manager
   */
  public async initialize(): Promise<void> {
    // If already initialized, return
    if (this.isReady()) {
      return;
    }
    
    // If already initializing, wait for it to complete
    if (isInitializing && initializePromise) {
      await initializePromise;
      return;
    }
    
    // Set initializing flag
    isInitializing = true;
    
    // Create initialization promise
    initializePromise = (async () => {
      try {
        // Initialize pool manager first
        await this.poolManager.initialize();
        
        // Initialize pg-promise
        const pgp = pgPromise({
          // Global event handlers
          error: (err, e) => {
            logger.error('Database error:', { error: err, context: e.cn });
          }
        });
        
        // Create database pool
        this.pool = pgp(this.connectionOptions);
        
        // Test connection
        await this.pool.connect();
        
        // Register the pool with the service container
        this.registerWithServiceContainer();
        
        this.initialized = true;
        this.isPoolSafeForReuse = true;
        logger.info('Database state manager initialized successfully');
      } catch (error) {
        this.initialized = false;
        this.isPoolSafeForReuse = false;
        logger.error('Failed to initialize database state manager', error);
        throw error;
      } finally {
        isInitializing = false;
        initializePromise = null;
      }
    })();

    await initializePromise;
  }

  /**
   * Register the database pool with the service container
   */
  private registerWithServiceContainer(): void {
    // Register pool with the service container for tests to use
    try {
      const container = ServiceContainer.getInstance();
      
      // Only register if the pool exists
      if (this.pool) {
        container.register('pool', this.pool);
        container.register('databasePool', this.pool);
      }
    } catch (error) {
      logger.warn('Failed to register database pool with service container', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Check if the database state manager is ready
   */
  public isReady(): boolean {
    return this.initialized && this.pool !== null && this.isPoolSafeForReuse;
  }

  /**
   * Get the database pool
   */
  public getPool(): IDatabase<any> {
    if (!this.isReady()) {
      throw new Error('Database not initialized');
    }
    
    return this.pool!;
  }

  /**
   * Clean the database by truncating all tables and resetting sequences
   */
  public async cleanDatabase(): Promise<void> {
    // Skip if shutting down
    if (isShuttingDown) {
      logger.warn('Database cleanup skipped because system is shutting down');
      return;
    }

    try {
      // If not initialized, try to initialize
      if (!this.isReady()) {
        try {
          await this.initialize();
        } catch (error) {
          throw new Error(`Failed to initialize database for cleanup: ${error}`);
        }
      }

      // Attempt a connection test before proceeding
      if (!this.pool) {
        throw new Error('No database pool available');
      }

      try {
        // Test connection
        await this.pool.one('SELECT 1 AS connection_test');
      } catch (connectionError) {
        logger.warn('Connection test failed during cleanup, reinitializing database', connectionError);
        // Force reinitialization
        this.pool = null;
        this.initialized = false;
        this.isPoolSafeForReuse = false;
        await this.initialize();
        
        if (!this.pool) {
          throw new Error('Failed to reinitialize database connection');
        }
      }

      // At this point we should have a valid pool
      // Use type assertion to assure TypeScript that pool is not null
      const db = this.pool as IDatabase<any>;
      
      // Truncate all tables
      await withRetry(
        () => truncateAllTables(db),
        'truncate all tables',
        3,
        500
      );
      
      // Reset sequences
      await withRetry(
        () => resetSequences(db),
        'reset sequences',
        3,
        500
      );
      
      logger.debug('Database cleaned successfully');
    } catch (error) {
      logger.error('Failed to clean database', error);
      
      // Try to recover by reinitializing for future tests
      try {
        logger.info('Attempting recovery by reinitializing database connection');
        this.pool = null;
        this.initialized = false;
        this.isPoolSafeForReuse = false;
        await this.initialize();
        logger.info('Database connection recovery successful');
      } catch (recoveryError) {
        logger.error('Recovery attempt failed:', recoveryError);
      }
      
      // Mark the pool as unsafe for reuse after a failed cleanup
      this.isPoolSafeForReuse = false;
      throw new Error(`Failed to clean database: ${error}`);
    }
  }

  /**
   * Acquire a database connection for a test suite
   */
  public async acquireConnection(suiteId: string): Promise<IDatabase<any>> {
    // If not initialized, initialize first
    if (!this.isReady()) {
      await this.initialize();
    }
    
    // Register the test suite if not already registered
    if (!this.activeSuites.has(suiteId)) {
      await this.registerTestSuite(suiteId);
    }
    
    // Return the shared pool - we're using a single pool for all test suites
    // to avoid connection limit issues
    const pool = this.getPool();
    
    // Track this connection
    this.activeConnections.set(suiteId, pool);
    
    return pool;
  }

  /**
   * Release a database connection for a test suite
   */
  public releaseConnection(suiteId: string): void {
    // Remove from active connections
    this.activeConnections.delete(suiteId);
    
    // If no more active connections for this suite, consider unregistering
    if (!this.activeConnections.has(suiteId)) {
      this.unregisterTestSuite(suiteId).catch(err => {
        logger.error(`Error unregistering test suite ${suiteId}`, err);
      });
    }
  }

  /**
   * Register a test suite with the database state manager
   */
  public async registerTestSuite(suiteId: string): Promise<void> {
    // If not initialized, initialize first
    if (!this.isReady()) {
      await this.initialize();
    }
    
    // Register with the pool manager
    this.poolManager.registerTestSuite(suiteId);
    
    // Add to our active suites
    this.activeSuites.add(suiteId);
    
    logger.debug(`Test suite ${suiteId} registered`);
  }

  /**
   * Unregister a test suite from the database state manager
   */
  public async unregisterTestSuite(suiteId: string): Promise<void> {
    try {
      // First unregister from the pool manager
      await this.poolManager.unregisterTestSuite(suiteId);
      
      // Remove from our active suites
      this.activeSuites.delete(suiteId);
      
      // If no more active suites and we have a dedicated connection for this suite,
      // release it
      if (this.activeConnections.has(suiteId)) {
        this.activeConnections.delete(suiteId);
      }
      
      // If no more active suites, consider shutting down
      if (this.activeSuites.size === 0 && this.activeConnections.size === 0) {
        // Don't await this - let it run in the background
        this.considerShutdown();
        logger.info('No more test suites registered, initiating shutdown');
      }
      
      logger.debug(`Test suite ${suiteId} unregistered`);
    } catch (error) {
      logger.error(`Failed to unregister test suite ${suiteId}`, error);
      // Don't throw - this is cleanup code
    }
  }

  /**
   * Considers shutting down the pool if there are no active suites or connections.
   * If there are still active suites or connections, it will wait and check again.
   * Otherwise, it will keep the pool alive for future tests.
   */
  private considerShutdown(): void {
    if (this.activeSuites.size > 0 || this.activeConnections.size > 0) {
      // Still have active suites or connections, wait and check again
      setTimeout(() => this.considerShutdown(), 5000);
      return;
    }

    // No active suites or connections, but we'll keep the pool alive for future tests
    logger.info('No active suites or connections, but keeping pool alive for future tests');
    
    // We'll check again in a while in case new tests start
    setTimeout(() => this.considerShutdown(), 5000);
  }

  /**
   * Shutdown the database state manager and release all resources
   * This should only be called at the end of the entire test run
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down database state manager...');

    try {
      // Clear service container
      ServiceContainer.getInstance().clear();
      logger.info('Service container cleared successfully');

      // Shut down pool manager
      if (this.poolManager) {
        await this.poolManager.shutdown();
        logger.info('Pool manager shut down successfully');
      }

      // End all connection pools
      if (this.pool) {
        // Use pgPromise to end the pool properly
        const pgp = pgPromise();
        pgp.end(); // This will properly end all connection pools
        logger.info('Database connection pool ended successfully');
        this.pool = null;
      }

      // Reset initialization state
      this.initialized = false;
      this.activeConnections.clear();
      this.activeSuites.clear();
      logger.info('Database state manager shut down successfully');
    } catch (err: unknown) {
      logger.error('Error shutting down database state manager', { error: err });
      throw err;
    }
  }

  /**
   * Static method to reset the instance for testing
   */
  public static resetInstance(): void {
    if (DatabaseStateManager.instance) {
      DatabaseStateManager.instance.shutdown().catch(err => {
        logger.error('Error shutting down database state manager during reset', err);
      });
    }
    DatabaseStateManager.instance = null;
  }
}

// Export a singleton instance for convenience
export const dbManager = DatabaseStateManager.getInstance();