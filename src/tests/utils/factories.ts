import { IDatabase } from 'pg-promise';
import type { IBaseProtocol } from 'pg-promise';
import crypto from 'crypto';
import type { UserPreferences } from '../../types/user';
import { User as DBUser } from '../../server/models/user';
import { DatabaseStateManager } from './database-state-manager';
import { logger } from '../../server/utils/logger';
import { FeedConfig } from '../../server/models/feed-config.model';
import { FeedHealth } from '../../types/feed-health';

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export interface CreateUserOptions {
  id?: number;
  google_id?: string | undefined;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateFeedConfigOptions {
  feed_url?: string;
  feed_type?: string;
  title?: string;
  description?: string;
  icon_url?: string;
  fetch_interval_minutes?: number;
  last_fetched_at?: Date | null;
}

export interface CreateFeedItemOptions {
  source_type?: string;
  source_id?: string;
  title?: string;
  author?: string;
  content?: string;
  summary?: string;
  description?: string;
  url?: string;
  guid?: string;
  published_at?: Date;
  categories?: string[];
  crawled_at?: Date;
  last_synced_at?: Date;
  engagement_score?: number;
  raw_metadata?: Record<string, any>;
}

export interface CreateFeedHealthOptions {
  last_check_at: Date;
  last_error_at: Date | null;
  last_error_category: string | null;
  last_error_detail: string | null;
  consecutive_failures: number;
  is_permanently_invalid: boolean;
  requires_special_handling: boolean;
  special_handler_type: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProcessedItemOptions {
  processed_summary?: string;
  content_type?: string;
  time_sensitive?: boolean;
  required_background?: string[];
  consumption_time_minutes?: number;
  consumption_type?: string;
  processed_at?: Date;
  version?: number;
}

export interface CreateUserPreferencesOptions {
  theme?: string;
  email_notifications?: boolean;
  content_language?: string;
  summary_level?: number;
}

export interface CreateLoginHistoryOptions {
  ip_address?: string;
  user_agent?: string;
  success?: boolean;
  failure_reason?: string;
  request_path?: string;
}

export interface CreateSessionOptions {
  session_token?: string;
  expires_at?: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface CreateSyncHistoryOptions {
  started_at?: Date;
  completed_at?: Date;
  success?: boolean;
  error_message?: string;
  items_processed?: number;
}

interface TestUser {
  id: number;
  email: string;
  password_hash?: string;
  google_id?: string;
  display_name?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

interface TestFeedConfig {
  id: number;
  user_id: number;
  feed_url: string;
  feed_type: string;
  title: string;
  description: string;
  icon_url: string;
  fetch_interval_minutes: number;
  last_fetched_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface TestFeedHealth {
  id: number;
  feed_config_id: number;
  last_check_at: Date;
  last_error_at: Date | null;
  last_error_category: string | null;
  last_error_detail: string | null;
  consecutive_failures: number;
  is_permanently_invalid: boolean;
  requires_special_handling: boolean;
  special_handler_type: string | null;
  created_at: Date;
  updated_at: Date;
}

export class TestDataFactory {
  private static instance: TestDataFactory | null = null;
  private pool: IDatabase<any> | null = null;
  private sequences: { [key: string]: number } = {};
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private initializationLock = false;
  private dbManager: DatabaseStateManager;

  private constructor() {
    this.sequences = {};
    this.dbManager = DatabaseStateManager.getInstance();
  }

  public static getInstance(): TestDataFactory {
    if (!TestDataFactory.instance) {
      TestDataFactory.instance = new TestDataFactory();
    }
    return TestDataFactory.instance;
  }

  public async reset(): Promise<void> {
    this.pool = null;
    this.initialized = false;
  }

  /**
   * Reset the database connection to ensure we have a valid connection
   * Used primarily in test cleanup to prevent connection pool errors
   */
  public async resetConnection(): Promise<void> {
    try {
      // Check if db manager is ready
      if (this.dbManager && this.dbManager.isReady()) {
        // Re-acquire the pool
        this.pool = this.dbManager.getPool();
        logger.info('TestDataFactory connection reset successfully');
      } else {
        logger.warn('Cannot reset connection: DatabaseStateManager not ready');
      }
    } catch (error) {
      logger.error('Error resetting TestDataFactory connection:', error);
      // Set pool to null to force reconnection on next use
      this.pool = null;
      this.initialized = false;
    }
  }

  public async initialize(pool?: IDatabase<any>): Promise<void> {
    if (pool) {
      this.pool = pool;
      this.initialized = true;
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        try {
          if (!this.dbManager.isReady()) {
            await this.dbManager.initialize();
          }
          this.pool = this.dbManager.getPool();
          this.initialized = true;
        } catch (error) {
          logger.error('Failed to initialize TestDataFactory:', error);
          throw error;
        } finally {
          this.initializationPromise = null;
        }
      })();
    }

    await this.initializationPromise;
  }

  public getPool(): IDatabase<any> {
    if (!this.pool || !this.initialized) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  public static async initialize(): Promise<void> {
    const instance = TestDataFactory.getInstance();
    await instance.initialize();
  }

  public static async reset(): Promise<void> {
    if (TestDataFactory.instance) {
      // Wait for any ongoing initialization to complete
      if (TestDataFactory.instance.initializationPromise) {
        try {
          await TestDataFactory.instance.initializationPromise;
        } catch (error) {
          logger.error('Error waiting for initialization during reset:', error);
        }
      }

      // Reset state
      TestDataFactory.instance.sequences = {};
      TestDataFactory.instance.initialized = false;
      TestDataFactory.instance.initializationPromise = null;
      TestDataFactory.instance.initializationLock = false;
      TestDataFactory.instance.pool = null;
    }
    TestDataFactory.instance = null;
  }

  public resetSequences(): void {
    this.sequences = {};
  }

  private getNextSequence(name: string): number {
    if (!this.sequences[name]) {
      this.sequences[name] = 1;
    }
    return this.sequences[name]++;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.pool || !this.dbManager.isReady()) {
      logger.info('TestDataFactory needs initialization, attempting to initialize...');
      
      try {
        await this.initialize();
        
        if (!this.pool) {
          // Try direct initialization from database manager
          logger.info('Pool not set after initialization, trying direct connection from DatabaseStateManager');
          
          if (this.dbManager && this.dbManager.isReady()) {
            try {
              this.pool = this.dbManager.getPool();
              logger.info('Successfully obtained pool from DatabaseStateManager');
            } catch (poolError) {
              logger.error('Error getting pool from DatabaseStateManager:', poolError);
              throw new Error(`Failed to get pool from DatabaseStateManager: ${poolError}`);
            }
          } else {
            logger.error('DatabaseStateManager not ready after initialization');
            
            // Last attempt to reinitialize database manager
            logger.info('Attempting to reinitialize DatabaseStateManager');
            try {
              await this.dbManager.initialize();
              this.pool = this.dbManager.getPool();
              logger.info('Successfully reinitialized DatabaseStateManager and obtained pool');
            } catch (reinitError) {
              logger.error('Failed to reinitialize DatabaseStateManager:', reinitError);
              throw new Error('Database initialization failed: DatabaseStateManager cannot be initialized');
            }
          }
        }
        
        // Verify the connection works
        if (this.pool) {
          try {
            await this.pool.one('SELECT 1 AS connection_test');
            logger.info('Database connection verified successfully');
          } catch (connectionError) {
            logger.error('Database connection verification failed:', connectionError);
            throw new Error(`Database connection verification failed: ${connectionError}`);
          }
        } else {
          throw new Error('Database initialization failed: No pool available after all attempts');
        }
      } catch (error) {
        logger.error('Database initialization failed in TestDataFactory:', error);
        throw new Error(`Database initialization failed: ${error}`);
      }
    }
  }

  /**
   * Get a healthy database connection, checking if the current pool is alive
   */
  private async getHealthyPool(): Promise<IDatabase<any>> {
    await this.ensureInitialized();
    
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    
    try {
      // Test if the pool is alive with a simple query
      await this.pool.one('SELECT 1 AS connection_test');
      return this.pool;
    } catch (error) {
      logger.warn('Database connection test failed, getting fresh pool', error);
      
      // Get a fresh connection from the database manager
      if (this.dbManager && this.dbManager.isReady()) {
        try {
          this.pool = this.dbManager.getPool();
          return this.pool;
        } catch (poolError) {
          logger.error('Failed to get fresh pool from database manager', poolError);
          throw new Error('Failed to get healthy database connection');
        }
      } else {
        throw new Error('Database manager not ready');
      }
    }
  }

  public async withTransaction<T>(callback: (t: IDatabase<any>) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Get a healthy pool for the transaction
        const pool = await this.getHealthyPool();
        
        // Execute the transaction
        return await pool.tx(async (t) => {
          return callback(t);
        });
      } catch (error: any) {
        lastError = error;
        
        // If this is a connection pool destroyed error, try to reconnect
        if (error.message && error.message.includes('Connection pool') && attempt < MAX_RETRIES) {
          logger.warn(`Database transaction failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`, error);
          
          // Force reinitialization on next attempt
          this.pool = null;
          this.initialized = false;
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
          continue;
        }
        
        // For other errors, or if we've reached max retries, rethrow
        throw error;
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw lastError || new Error('Unknown error in withTransaction');
  }

  /**
   * Execute a database operation with retry logic for connection failures
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // If this is a connection pool destroyed error, try to reconnect
        if (error.message && error.message.includes('Connection pool') && attempt < MAX_RETRIES) {
          logger.warn(`Database operation failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`, error);
          
          // Force reinitialization on next attempt
          this.pool = null;
          this.initialized = false;
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
          continue;
        }
        
        // For other errors, or if we've reached max retries, rethrow
        throw error;
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw lastError || new Error('Unknown error in withRetry');
  }

  // Factory methods
  public async createUser(overrides: Partial<DBUser> = {}): Promise<DBUser> {
    try {
      logger.info('Creating user in TestDataFactory...');
      await this.ensureInitialized();
      const seq = this.getNextSequence('user');
      const now = new Date();
      const timestamp = Date.now();
      
      logger.info('Starting user creation transaction...');
      
      return this.withTransaction(async (t) => {
        const user: TestUser = {
          id: overrides.id ?? seq,
          email: overrides.email ?? `test${seq}_${timestamp}@example.com`,
          google_id: overrides.hasOwnProperty('google_id') ? overrides.google_id : `g${seq}_${timestamp}`,
          display_name: overrides.display_name ?? `Test User ${seq}`,
          avatar_url: overrides.avatar_url ?? `https://example.com/avatar${seq}.jpg`,
          created_at: overrides.created_at ?? now,
          updated_at: overrides.updated_at ?? now
        };

        logger.info('Executing user insert query...', { email: user.email });

        const result = await t.one<DBUser>(
          `INSERT INTO users (
            id,
            email,
            google_id,
            display_name,
            avatar_url,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            user.id,
            user.email,
            user.google_id,
            user.display_name,
            user.avatar_url,
            user.created_at,
            user.updated_at
          ]
        );

        // Create default user preferences
        logger.info('Creating default user preferences...');
        await t.none(
          `INSERT INTO user_preferences (
            user_id, theme, email_notifications, content_language, summary_level, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
          )`,
          [
            result.id,
            'light',
            true,
            'en',
            1,
            now,
            now
          ]
        );
        logger.info('User preferences created successfully');

        logger.info('User created successfully:', { userId: result.id });
        return result;
      });
    } catch (error) {
      logger.error('Error in createUser:', error);
      throw error;
    }
  }

  public async createUserPreferences(userId: number, overrides: CreateUserPreferencesOptions = {}): Promise<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {
    await this.ensureInitialized();
    
    return this.withTransaction(async (t) => {
      const now = new Date();
      const preferences: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        theme: (overrides.theme as 'light' | 'dark') ?? 'light',
        email_notifications: overrides.email_notifications ?? true,
        content_language: overrides.content_language ?? 'en',
        summary_level: overrides.summary_level ?? 1
      };

      await t.none(
        `INSERT INTO user_preferences (
          user_id, theme, email_notifications, content_language, summary_level, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )`,
        [
          userId,
          preferences.theme,
          preferences.email_notifications,
          preferences.content_language,
          preferences.summary_level,
          now,
          now
        ]
      );

      return preferences;
    });
  }

  public async createFeedConfig(userId: number, overrides: Partial<FeedConfig> = {}): Promise<FeedConfig> {
    return this.withTransaction(async (t) => {
      // First verify the user exists
      const userExists = await t.oneOrNone(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (!userExists) {
        throw new Error(`User with ID ${userId} does not exist`);
      }

      const defaultConfig = {
        id: this.getNextSequence('feedId'),
        feed_url: `https://test${Date.now()}.com/feed.xml`,
        feed_type: 'RSS',
        title: 'Test Feed',
        description: 'Test Feed Description',
        site_url: `https://test${Date.now()}.com`,
        icon_url: `https://test${Date.now()}.com/icon.png`,
        is_active: true,
        fetch_interval_minutes: 60,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides
      };

      return t.one<FeedConfig>(`
        INSERT INTO feed_configs (
          id,
          user_id,
          feed_url,
          feed_type,
          title,
          description,
          site_url,
          icon_url,
          is_active,
          fetch_interval_minutes,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        defaultConfig.id,
        userId,
        defaultConfig.feed_url,
        defaultConfig.feed_type,
        defaultConfig.title,
        defaultConfig.description,
        defaultConfig.site_url,
        defaultConfig.icon_url,
        defaultConfig.is_active,
        defaultConfig.fetch_interval_minutes,
        defaultConfig.created_at,
        defaultConfig.updated_at
      ]);
    });
  }

  async createFeedHealth(feedConfigId: number, overrides: Partial<FeedHealth> = {}): Promise<FeedHealth> {
    return this.withTransaction(async (t) => {
      // First verify the feed config exists
      const feedConfig = await t.oneOrNone(
        'SELECT feed_url FROM feed_configs WHERE id = $1',
        [feedConfigId]
      );

      if (!feedConfig) {
        throw new Error(`Feed config with id ${feedConfigId} does not exist`);
      }

      const isKijijiFeed = feedConfig.feed_url.includes('kijiji.ca');
      const now = new Date();

      const defaultHealth = {
        feed_config_id: feedConfigId,
        last_check_at: now,
        last_error_at: null,
        last_error_category: null,
        last_error_detail: null,
        consecutive_failures: 0,
        is_permanently_invalid: false,
        requires_special_handling: isKijijiFeed,
        special_handler_type: isKijijiFeed ? 'KIJIJI' : null,
        created_at: now,
        updated_at: now,
        ...overrides
      };

      return t.one<FeedHealth>(`
        INSERT INTO feed_health (
          feed_config_id,
          last_check_at,
          last_error_at,
          last_error_category,
          last_error_detail,
          consecutive_failures,
          is_permanently_invalid,
          requires_special_handling,
          special_handler_type,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        defaultHealth.feed_config_id,
        defaultHealth.last_check_at,
        defaultHealth.last_error_at,
        defaultHealth.last_error_category,
        defaultHealth.last_error_detail,
        defaultHealth.consecutive_failures,
        defaultHealth.is_permanently_invalid,
        defaultHealth.requires_special_handling,
        defaultHealth.special_handler_type,
        defaultHealth.created_at,
        defaultHealth.updated_at
      ]);
    });
  }

  async getFeedHealth(feedConfigId: number): Promise<FeedHealth | null> {
    await this.ensureInitialized();
    
    return this.withRetry(async () => {
      const pool = await this.getHealthyPool();
      return pool.oneOrNone<FeedHealth>(
        'SELECT * FROM feed_health WHERE feed_config_id = $1',
        [feedConfigId]
      );
    });
  }

  /**
   * Find a user by ID with connection retry logic
   */
  async findUserById(userId: number): Promise<DBUser | null> {
    return this.withRetry(async () => {
      const pool = await this.getHealthyPool();
      return pool.oneOrNone<DBUser>('SELECT * FROM users WHERE id = $1', [userId]);
    });
  }

  async createUserWithFeed(overrides: {
    user?: Partial<DBUser>;
    feed?: Partial<FeedConfig>;
    health?: Partial<FeedHealth>;
  } = {}): Promise<{
    user: DBUser;
    feed: FeedConfig;
    health: FeedHealth;
  }> {
    return this.withTransaction(async (t) => {
      // Create user
      const user = await this.createUser(overrides.user);
      
      // Create feed config
      const feed = await this.createFeedConfig(user.id, overrides.feed);
      
      // Create feed health
      const health = await this.createFeedHealth(feed.id, overrides.health);

      return { user, feed, health };
    });
  }
}