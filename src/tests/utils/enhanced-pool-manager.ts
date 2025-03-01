import pg from 'pg';
// Use type assertion to work around the type checking issue
const { Pool } = pg as any;
// Import the types
import type { Pool as PoolType } from 'pg';
// We need to get PoolClient type from the types directory since it's not directly exported
import type { ClientBase } from 'pg';
// Define a custom interface that extends ClientBase and adds the release method
interface PoolClientType extends ClientBase {
  release: () => Promise<void>;
  query: (text: string, params?: any[]) => Promise<any>;
}

import { logger } from '../../server/logger';
import crypto from 'crypto';

// Constants for pool management
const POOL_CONFIG = {
  max: 20,                         // Maximum number of clients
  idleTimeoutMillis: 30000,       // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000,   // How long to wait for a connection
  statement_timeout: 30000,        // Statement timeout (30 seconds)
  application_name: 'test_runner'  // Identify connections in pg_stat_activity
};

interface PoolState {
  pool: PoolType;
  activeConnections: Set<PoolClientType>;
  activeTransactions: Map<PoolClientType, string>;
  isShuttingDown: boolean;
  lastActivity: Date;
  testSuites: Set<string>;
  isEnded: boolean;
}

declare global {
  var __testPool: PoolState | undefined;
}

export class EnhancedPoolManager {
  private static instance: EnhancedPoolManager | null = null;
  private initialized = false;
  private testSuiteId: string;
  private initializationPromise: Promise<void> | null = null;
  private initializationLock = false;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 5000; // Check for stale connections every 5 seconds
  private readonly CONNECTION_TIMEOUT_MS = 30000; // Consider connections stale after 30 seconds of inactivity
  private readonly SHUTDOWN_TIMEOUT_MS = 30000; // Wait up to 30 seconds for shutdown
  private shutdownPromise: Promise<void> | null = null;

  private constructor() {
    this.testSuiteId = crypto.randomUUID();
    this.initializationPromise = null;
    this.cleanupTimer = null;
    this.shutdownPromise = null;
  }

  public static getInstance(): EnhancedPoolManager {
    if (!EnhancedPoolManager.instance) {
      EnhancedPoolManager.instance = new EnhancedPoolManager();
    }
    return EnhancedPoolManager.instance;
  }

  public static resetForTesting(): void {
    if (EnhancedPoolManager.instance) {
      if (EnhancedPoolManager.instance.cleanupTimer) {
        clearInterval(EnhancedPoolManager.instance.cleanupTimer);
      }
      EnhancedPoolManager.instance.shutdown().catch(err => {
        logger.error('Error during pool manager reset:', err);
      });
    }
    EnhancedPoolManager.instance = null;
    global.__testPool = undefined;
  }

  public isInitialized(): boolean {
    const state = this.getState();
    return this.initialized && !state.isShuttingDown && !state.isEnded;
  }

  private getState(): PoolState {
    if (!global.__testPool || global.__testPool.isEnded) {
      const pool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/ai-feed-test',
        ...POOL_CONFIG
      });

      // Set up pool error handler
      pool.on('error', (err: Error, client: any) => {
        logger.error('Unexpected error on idle client', err);
        if (global.__testPool?.activeConnections.has(client)) {
          global.__testPool.activeConnections.delete(client);
        }
        if (global.__testPool?.activeTransactions.has(client)) {
          global.__testPool.activeTransactions.delete(client);
        }
      });

      global.__testPool = {
        pool,
        activeConnections: new Set(),
        activeTransactions: new Map(),
        isShuttingDown: false,
        lastActivity: new Date(),
        testSuites: new Set(),
        isEnded: false
      };
    }
    return global.__testPool;
  }

  public registerTestSuite(suiteId: string): void {
    const state = this.getState();
    if (state.isShuttingDown || state.isEnded) {
      throw new Error('Cannot register test suite while pool is shutting down or ended');
    }
    state.testSuites.add(suiteId);
    state.lastActivity = new Date();
    logger.info({ suiteId }, 'Test suite registered');
  }

  public async unregisterTestSuite(suiteId: string): Promise<void> {
    const state = this.getState();
    state.testSuites.delete(suiteId);
    state.lastActivity = new Date();
    logger.info({ suiteId }, 'Test suite unregistered');

    // If no more test suites are registered, initiate shutdown after a delay
    if (state.testSuites.size === 0 && !state.isShuttingDown && !state.isEnded) {
      // Wait for any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check again in case new test suites were registered
      if (state.testSuites.size === 0 && !state.isShuttingDown && !state.isEnded) {
        logger.info('No more test suites registered, initiating shutdown');
        await this.shutdown();
      }
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupStaleConnections();
      } catch (error) {
        logger.error('Error during stale connection cleanup:', error);
      }
    }, this.CLEANUP_INTERVAL_MS);
  }

  private async cleanupStaleConnections(): Promise<void> {
    const state = this.getState();
    const now = new Date();
    const staleThreshold = now.getTime() - this.CONNECTION_TIMEOUT_MS;

    // Only perform cleanup if there are no registered test suites and no recent activity
    if (state.testSuites.size === 0 && 
        state.lastActivity.getTime() < staleThreshold && 
        state.activeConnections.size === 0 &&
        !state.isShuttingDown &&
        !state.isEnded) {
      logger.info('No recent activity, no active connections, and no test suites, initiating shutdown');
      await this.shutdown();
      return;
    }

    // Don't check connections if shutting down or ended
    if (state.isShuttingDown || state.isEnded) {
      return;
    }

    // Check each active connection
    for (const client of state.activeConnections) {
      try {
        // If in a transaction, check if it's stale
        const txId = state.activeTransactions.get(client);
        if (txId) {
          const result = await client.query('SELECT now() - xact_start > interval \'30 seconds\' as is_stale FROM pg_stat_activity WHERE pid = pg_backend_pid()');
          if (result.rows[0]?.is_stale) {
            logger.warn({ txId }, 'Found stale transaction, rolling back');
            await this.rollbackTransaction(client);
          }
        }

        // Test if connection is still alive
        await client.query('SELECT 1');
      } catch (error) {
        logger.error('Error checking connection health, releasing:', error);
        try {
          await client.release();
        } catch (releaseError) {
          logger.error('Error releasing unhealthy connection:', releaseError);
        }
        state.activeConnections.delete(client);
        state.activeTransactions.delete(client);
      }
    }
  }

  public async initialize(): Promise<void> {
    // If already initialized and not shutting down or ended, return immediately
    let currentState = this.getState();
    if (this.initialized && !currentState.isShuttingDown && !currentState.isEnded) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    // Acquire initialization lock
    if (this.initializationLock) {
      throw new Error('Pool manager initialization already in progress');
    }
    this.initializationLock = true;

    // Start initialization
    this.initializationPromise = (async () => {
      try {
        // If shutting down, wait for shutdown to complete
        if (currentState.isShuttingDown) {
          try {
            await this.waitForShutdown();
          } catch (error) {
            logger.error('Failed to wait for shutdown during initialization:', error);
            // Force cleanup and continue
            await this.forceCleanup(currentState);
            currentState.isShuttingDown = false;
          }
        }

        // If pool was ended, create a new one
        if (currentState.isEnded) {
          global.__testPool = undefined;
          currentState = this.getState();
        }

        // Ensure clean state
        if (currentState.activeConnections.size > 0 || currentState.activeTransactions.size > 0) {
          logger.warn('Found active connections or transactions during initialization');
          await this.forceCleanup(currentState);
        }

        // Test the connection
        const client = await currentState.pool.connect();
        try {
          await client.query('SELECT 1');
          this.initialized = true;
          currentState.isShuttingDown = false;
          currentState.isEnded = false;
          currentState.lastActivity = new Date();
          this.startCleanupTimer();
          logger.info('Enhanced pool manager initialized successfully');
        } finally {
          await client.release();
        }
      } catch (error) {
        logger.error('Failed to initialize pool manager:', error);
        this.initialized = false;
        throw error;
      } finally {
        this.initializationPromise = null;
        this.initializationLock = false;
      }
    })();

    await this.initializationPromise;
  }

  private async waitForShutdown(): Promise<void> {
    const startTime = Date.now();
    const state = this.getState();

    while (state.isShuttingDown && Date.now() - startTime < this.SHUTDOWN_TIMEOUT_MS) {
      if (this.shutdownPromise) {
        try {
          await Promise.race([
            this.shutdownPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timed out waiting for pool shutdown')), 
              this.SHUTDOWN_TIMEOUT_MS)
            )
          ]);
          return;
        } catch (error: any) {
          if (error.message === 'Timed out waiting for pool shutdown') {
            throw error;
          }
          // If shutdown failed, continue waiting
          logger.warn('Shutdown attempt failed, continuing to wait:', error);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (state.isShuttingDown) {
      throw new Error('Timed out waiting for pool shutdown');
    }
  }

  private async forceCleanup(state: PoolState): Promise<void> {
    logger.info('Performing forced cleanup of pool state');

    // Roll back any active transactions
    const rollbackPromises = Array.from(state.activeTransactions.entries()).map(async ([client, txId]) => {
      try {
        logger.warn({ txId }, 'Rolling back transaction during forced cleanup');
        await this.rollbackTransaction(client);
      } catch (error) {
        logger.error({ txId }, 'Error rolling back transaction during forced cleanup:', error);
      }
    });

    // Release all active connections
    const releasePromises = Array.from(state.activeConnections).map(async (client) => {
      try {
        await client.release();
      } catch (error) {
        logger.error('Error releasing connection during forced cleanup:', error);
      }
    });

    // Wait for all cleanup operations to complete
    await Promise.all([...rollbackPromises, ...releasePromises]);

    // Clear all state
    state.activeConnections.clear();
    state.activeTransactions.clear();
    state.testSuites.clear();
    state.lastActivity = new Date();
  }

  public async shutdown(): Promise<void> {
    const state = this.getState();
    if (state.isShuttingDown) {
      await this.waitForShutdown();
      return;
    }

    state.isShuttingDown = true;
    this.shutdownPromise = (async () => {
      try {
        // Stop cleanup timer
        if (this.cleanupTimer) {
          clearInterval(this.cleanupTimer);
          this.cleanupTimer = null;
        }

        // Wait for active operations to complete
        const startTime = Date.now();
        while (state.activeConnections.size > 0 && Date.now() - startTime < this.SHUTDOWN_TIMEOUT_MS) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // If there are still active connections, force cleanup
        if (state.activeConnections.size > 0) {
          logger.warn('Found active connections during shutdown, forcing cleanup');
          await this.forceCleanup(state);
        }

        // End the pool
        await state.pool.end();
        state.isEnded = true;
        this.initialized = false;
        logger.info('Pool manager shut down successfully');
      } catch (error) {
        logger.error('Error during pool shutdown:', error);
        throw error;
      } finally {
        state.isShuttingDown = false;
        this.shutdownPromise = null;
      }
    })();

    await this.shutdownPromise;
  }

  public async beginTransaction(client: PoolClientType): Promise<void> {
    const state = this.getState();
    if (state.isShuttingDown || state.isEnded) {
      throw new Error('Cannot begin transaction while pool is shutting down or ended');
    }

    const txId = crypto.randomUUID();
    await client.query('BEGIN');
    state.activeTransactions.set(client, txId);
    state.lastActivity = new Date();
  }

  public async commitTransaction(client: PoolClientType): Promise<void> {
    const state = this.getState();
    try {
      await client.query('COMMIT');
    } finally {
      state.activeTransactions.delete(client);
      state.lastActivity = new Date();
    }
  }

  public async rollbackTransaction(client: PoolClientType): Promise<void> {
    const state = this.getState();
    try {
      await client.query('ROLLBACK');
    } finally {
      state.activeTransactions.delete(client);
      state.lastActivity = new Date();
    }
  }

  public async acquireConnection(): Promise<PoolClientType> {
    const state = this.getState();
    if (state.isShuttingDown || state.isEnded) {
      throw new Error('Cannot acquire connection while pool is shutting down or ended');
    }

    const client = await state.pool.connect();
    state.activeConnections.add(client);
    state.lastActivity = new Date();

    // Wrap release to track connection state
    const originalRelease = client.release;
    client.release = async () => {
      state.activeConnections.delete(client);
      state.activeTransactions.delete(client);
      state.lastActivity = new Date();
      return originalRelease.call(client);
    };

    return client;
  }

  public getPool(): PoolType {
    const state = this.getState();
    if (state.isShuttingDown || state.isEnded) {
      throw new Error('Cannot get pool while shutting down or ended');
    }
    return state.pool;
  }

  public getStats(): { poolStats: { activeConnections: number; activeTransactions: number; testSuites: number } } {
    const state = this.getState();
    return {
      poolStats: {
        activeConnections: state.activeConnections.size,
        activeTransactions: state.activeTransactions.size,
        testSuites: state.testSuites.size
      }
    };
  }
}

// Export singleton instance
export const poolManager = EnhancedPoolManager.getInstance(); 