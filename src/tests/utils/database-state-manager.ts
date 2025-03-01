import { IDatabase } from 'pg-promise';
import pgPromise from 'pg-promise';
import { logger } from '../../server/logger';
import { ConnectionPoolManager } from './connection-pool-manager';
import crypto from 'crypto';

const MAX_POOL_SIZE = 10;
const IDLE_TIMEOUT = 30000;
const CONNECTION_TIMEOUT = 30000;
const STATEMENT_TIMEOUT = 30000;
const LOCK_TIMEOUT = 10000;

// Constants
const TABLES_IN_ORDER = [
  'sync_history',
  'item_states',
  'processed_items',
  'feed_items',
  'feed_health',
  'feed_configs',
  'login_history',
  'user_preferences',
  'sessions',
  'users'
];

const SEQUENCES_TO_RESET = [
  'users_id_seq',
  'feed_configs_id_seq',
  'feed_items_id_seq',
  'feed_health_id_seq',
  'login_history_id_seq',
  'processed_items_id_seq',
  'item_states_id_seq'
];

export class DatabaseStateManager {
  private static instance: DatabaseStateManager | null = null;
  private db: IDatabase<any> | null = null;
  private isInitialized = false;
  private isShuttingDown = false;
  private activeSuites = new Set<string>();
  private initializationPromise: Promise<void> | null = null;
  private pgp: ReturnType<typeof pgPromise> | null = null;
  private initializationLock = false;
  private connectionManager: ConnectionPoolManager;
  private currentSuiteId: string;

  private constructor() {
    this.connectionManager = ConnectionPoolManager.getInstance();
    // Generate a unique suite ID for this database manager instance
    this.currentSuiteId = `db-manager-${crypto.randomUUID()}`;
  }

  public static getInstance(): DatabaseStateManager {
    if (!DatabaseStateManager.instance) {
      DatabaseStateManager.instance = new DatabaseStateManager();
    }
    return DatabaseStateManager.instance;
  }

  /**
   * Get the current suite ID - used for connection pool management
   */
  public getCurrentSuiteId(): string {
    return this.currentSuiteId;
  }

  public async initialize(): Promise<void> {
    // If already initialized and not shutting down, return immediately
    if (this.isInitialized && !this.isShuttingDown) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    // Acquire initialization lock
    if (this.initializationLock) {
      throw new Error('Database manager initialization already in progress');
    }
    this.initializationLock = true;

    // Start initialization
    this.initializationPromise = this._initialize();
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
      this.initializationLock = false;
    }
  }

  private async _initialize(): Promise<void> {
    if (this.isInitialized && !this.isShuttingDown) {
      return;
    }

    try {
      // If shutting down, wait for it to complete
      if (this.isShuttingDown) {
        await this.shutdown();
      }

      // Acquire a connection pool from the connection manager
      this.db = await this.connectionManager.acquirePool(this.currentSuiteId);

      // Verify the connection is working
      await this.verifyConnection();
      
      this.isInitialized = true;
      logger.info('DatabaseStateManager initialized successfully');
    } catch (error) {
      this.isInitialized = false;
      this.db = null;
      this.pgp = null;
      logger.error('Failed to initialize DatabaseStateManager:', error);
      throw error;
    }
  }

  /**
   * Verify the database connection is working properly
   */
  private async verifyConnection(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Test connection with a simple query
      await this.db.one('SELECT 1 AS connection_test');
      logger.info('Database connection verified successfully');
    } catch (error) {
      logger.error('Database connection verification failed:', error);
      throw new Error('Failed to verify database connection');
    }
  }

  /**
   * Get a healthy database connection, with auto-reconnect if needed
   */
  public async getHealthyConnection(): Promise<IDatabase<any>> {
    if (!this.isInitialized || this.isShuttingDown) {
      await this.initialize();
    }

    // Get a healthy connection from the connection manager
    return await this.connectionManager.getHealthyConnection(this.currentSuiteId);
  }

  /**
   * Check if the database pool is alive and can execute queries
   */
  public async isConnectionAlive(): Promise<boolean> {
    if (!this.isInitialized || !this.db) {
      return false;
    }

    return await this.connectionManager.isPoolAlive(this.currentSuiteId);
  }

  public getPool(): IDatabase<any> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  public isReady(): boolean {
    return this.isInitialized && !this.isShuttingDown && this.db !== null;
  }

  public async registerTestSuite(suiteId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    this.activeSuites.add(suiteId);
    logger.info(`Test suite ${suiteId} registered`);
  }

  public unregisterTestSuite(suiteId: string): void {
    this.activeSuites.delete(suiteId);
    logger.info(`Test suite ${suiteId} unregistered`);

    // If no active suites, trigger cleanup
    if (this.activeSuites.size === 0) {
      this.shutdown().catch(error => {
        logger.error('Error during automatic cleanup:', error);
      });
    }
  }

  public async cleanDatabase(): Promise<void> {
    if (!this.isInitialized || this.isShuttingDown) {
      return;
    }

    // Get a healthy connection
    try {
      const db = await this.getHealthyConnection();
      
      // Use a transaction for atomicity
      await db.tx(async t => {
        await this.truncateTables(t);
        await this.resetSequences(t);
      });
      
      logger.info('Database cleaned successfully');
    } catch (error) {
      logger.error('Failed to clean database:', error);
      throw error;
    }
  }

  private async truncateTables(t: IDatabase<any>): Promise<void> {
    try {
      // Disable foreign key checks temporarily
      await t.none('SET CONSTRAINTS ALL DEFERRED');

      // Truncate all tables in reverse dependency order
      for (const table of TABLES_IN_ORDER) {
        await t.none(`TRUNCATE TABLE "${table}" CASCADE`);
      }

      // Re-enable foreign key checks
      await t.none('SET CONSTRAINTS ALL IMMEDIATE');
    } catch (error) {
      logger.error('Error truncating tables:', error);
      throw error;
    }
  }

  private async resetSequences(t: IDatabase<any>): Promise<void> {
    try {
      for (const sequence of SEQUENCES_TO_RESET) {
        await t.none(`ALTER SEQUENCE "${sequence}" RESTART WITH 1`);
      }
    } catch (error) {
      logger.error('Error resetting sequences:', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    try {
      // Release our connection pool back to the connection manager
      if (this.db) {
        await this.connectionManager.releasePool(this.currentSuiteId);
        this.db = null;
      }

      this.isInitialized = false;
      this.initializationPromise = null;
      this.activeSuites.clear();
      logger.info('Database state manager shut down successfully');
    } catch (error) {
      logger.error('Error during database state manager shutdown:', error);
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }

  public static resetForTesting(): void {
    if (DatabaseStateManager.instance?.isInitialized) {
      DatabaseStateManager.instance.shutdown().catch(error => {
        logger.error('Error during instance reset:', error);
      });
    }
    DatabaseStateManager.instance = null;
  }
} 