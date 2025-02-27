import { IDatabase } from 'pg-promise';
import { User } from '../../types/user';
import { logger } from '../../server/logger';
import { DatabaseStateManager } from './database-state-manager';
import { FeedConfig } from '../../server/models/feed-config';
import { ConnectionPoolManager } from './connection-pool-manager';

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

// Add interfaces for database query results
interface QueryResult<T> {
  rows: T[];
}

interface SingleQueryResult<T> {
  rows: [T];
}

export class TestDataFactory {
  private static instance: TestDataFactory | null = null;
  private db: IDatabase<any> | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private initializationLock = false;
  private sequences: { [key: string]: number } = {};
  private dbManager: DatabaseStateManager;
  private connectionManager: ConnectionPoolManager;
  private suiteId: string;

  private constructor() {
    this.sequences = {};
    this.dbManager = DatabaseStateManager.getInstance();
    this.connectionManager = ConnectionPoolManager.getInstance();
    this.suiteId = this.dbManager.getCurrentSuiteId();
  }

  public static getInstance(): TestDataFactory {
    if (!TestDataFactory.instance) {
      TestDataFactory.instance = new TestDataFactory();
    }
    return TestDataFactory.instance;
  }

  public static resetInstance(): void {
    if (TestDataFactory.instance) {
      TestDataFactory.instance.db = null;
      TestDataFactory.instance.isInitialized = false;
      TestDataFactory.instance.initializationPromise = null;
      TestDataFactory.instance.initializationLock = false;
      TestDataFactory.instance.sequences = {};
    }
    TestDataFactory.instance = null;
    logger.info('Test data factory reset successfully');
  }

  public async initialize(db?: IDatabase<any>): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationLock) {
      if (this.initializationPromise) {
        await this.initializationPromise;
        return;
      }
      throw new Error('TestDataFactory initialization in inconsistent state');
    }

    this.initializationLock = true;

    try {
      this.initializationPromise = (async () => {
        if (db) {
          this.db = db;
        } else {
          if (!this.dbManager.isReady()) {
            await this.dbManager.initialize();
          }
          this.db = this.dbManager.getPool();
        }
        this.isInitialized = true;
        logger.info('TestDataFactory initialized successfully');
      })();

      await this.initializationPromise;
    } catch (error) {
      logger.error('Failed to initialize TestDataFactory:', error);
      throw error;
    } finally {
      this.initializationLock = false;
      this.initializationPromise = null;
    }
  }

  public isReady(): boolean {
    return this.isInitialized && !!this.db;
  }

  /**
   * Gets a healthy database connection, with auto reconnect if the current connection is destroyed
   */
  public async getHealthyDb(): Promise<IDatabase<any>> {
    if (!this.isInitialized) {
      throw new Error('TestDataFactory not initialized. Call initialize() first.');
    }
    
    try {
      // Try to get a healthy connection
      return await this.connectionManager.getHealthyConnection(this.suiteId);
    } catch (error) {
      // If that fails, try to re-initialize from the database manager
      logger.warn('Error getting healthy connection in TestDataFactory, attempting to reconnect', error);
      this.db = await this.dbManager.getHealthyConnection();
      
      if (!this.db) {
        throw new Error('Failed to get healthy database connection');
      }
      
      return this.db;
    }
  }

  /**
   * Gets the database connection - backward compatibility method
   * @deprecated Use getHealthyDb() instead for more reliable connection
   */
  public getDb(): IDatabase<any> {
    if (!this.isInitialized || !this.db) {
      throw new Error('TestDataFactory not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Execute a callback within a transaction, with retry logic for connection failures
   */
  private async withTransaction<T>(callback: (t: IDatabase<any>) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Get a healthy database connection
        const pool = await this.getHealthyDb();
        
        // Execute the transaction
        return await pool.tx(async t => {
          return callback(t);
        });
      } catch (error: any) {
        lastError = error;
        
        // If this is a connection pool destroyed error, try to reconnect
        if (error.message && error.message.includes('Connection pool') && attempt < MAX_RETRIES) {
          logger.warn(`Database transaction failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`, error);
          
          // Explicitly get a new connection before retrying
          try {
            // Try to get a fresh connection from the connection manager
            this.db = await this.connectionManager.getHealthyConnection(this.suiteId);
            logger.info(`Successfully reconnected to database pool on attempt ${attempt}`);
          } catch (reconnectError) {
            logger.error(`Failed to reconnect to database on attempt ${attempt}:`, reconnectError);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
        
        // For other errors, or if we've reached max retries, rethrow
        throw error;
      }
    }
    
    // This should never be reached due to the throw in the catch block,
    // but TypeScript requires a return statement
    throw lastError || new Error('Unknown error in withTransaction');
  }

  /**
   * Execute a callback with retry logic for connection failures
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
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
        
        // For other errors, or if we've reached max retries, rethrow
        throw error;
      }
    }
    
    // This should never be reached due to the throw in the catch block,
    // but TypeScript requires a return statement
    throw lastError || new Error('Unknown error in withRetry');
  }

  private getNextSequence(name: string): number {
    if (!this.sequences[name]) {
      this.sequences[name] = 1;
    }
    return this.sequences[name]++;
  }

  public resetSequences(): void {
    this.sequences = {};
  }

  // Factory methods
  public async createUser(overrides: Partial<User> = {}): Promise<User> {
    try {
      logger.info('Creating user in TestDataFactory...');

      if (!this.isReady()) {
        logger.error('TestDataFactory not initialized');
        throw new Error('TestDataFactory not initialized');
      }

      const seq = this.getNextSequence('user');
      const now = new Date();
      const timestamp = Date.now();
      
      logger.info('Starting user creation transaction...');
      
      return this.withTransaction(async (t) => {
        const user: Partial<User> = {
          email: overrides.email ?? `test${seq}_${timestamp}@example.com`,
          google_id: overrides.google_id ?? `g${seq}_${timestamp}`,
          display_name: overrides.display_name ?? `Test User ${seq}`,
          avatar_url: overrides.avatar_url ?? `https://example.com/avatar${seq}.jpg`,
          created_at: overrides.created_at ?? now,
          updated_at: overrides.updated_at ?? now
        };

        logger.info('Executing user insert query...', { user });

        const result = await t.one<User>(
          `INSERT INTO users (
            email,
            google_id,
            display_name,
            avatar_url,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            user.email,
            user.google_id,
            user.display_name,
            user.avatar_url,
            user.created_at,
            user.updated_at
          ]
        );

        logger.info('User created successfully:', { userId: result.id });
        return result;
      }).catch(error => {
        logger.error('Error in createUser transaction:', error);
        throw error;
      });
    } catch (error) {
      logger.error('Error in createUser:', error);
      throw error;
    }
  }

  public async findUserById(userId: number): Promise<User | null> {
    return this.withRetry(async () => {
      const db = await this.getHealthyDb();
      return db.oneOrNone<User>('SELECT * FROM users WHERE id = $1', [userId]);
    });
  }

  async createUserWithFeed(data: {
    user?: Partial<User>;
    feed?: {
      feedUrl: string;
      title?: string;
      description?: string;
      siteUrl?: string;
      iconUrl?: string;
      isActive?: boolean;
      feedType?: string;
    };
  } = {}): Promise<{
    user: User;
    feedId: number;
  }> {
    return this.withTransaction(async (client) => {
      // Create user
      const userResult = await client.one<User>(
        `INSERT INTO users (
          google_id,
          email,
          display_name,
          avatar_url,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *`,
        [
          data.user?.google_id || 'test-google-id',
          data.user?.email || 'test@example.com',
          data.user?.display_name || 'Test User',
          data.user?.avatar_url || 'https://example.com/avatar.jpg'
        ]
      );

      // Create user preferences
      await client.query(
        `INSERT INTO user_preferences (
          user_id,
          theme,
          email_notifications,
          content_language,
          summary_level,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          userResult.id,
          'light',
          true,
          'en',
          1
        ]
      );

      // Create feed config
      const feedResult = await client.one<{ id: number }>(
        `INSERT INTO feed_configs (
          user_id,
          feed_url,
          feed_type,
          title,
          description,
          site_url,
          icon_url,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id`,
        [
          userResult.id,
          data.feed?.feedUrl || 'https://example.com/feed.xml',
          data.feed?.feedType || 'rss',
          data.feed?.title || 'Test Feed',
          data.feed?.description || 'Test Feed Description',
          data.feed?.siteUrl || 'https://example.com',
          data.feed?.iconUrl || 'https://example.com/icon.png',
          data.feed?.isActive ?? true
        ]
      );

      return {
        user: userResult,
        feedId: feedResult.id
      };
    });
  }

  async createFeedItems(feedId: number, count: number = 1): Promise<any[]> {
    return this.withTransaction(async (client) => {
      const items = [];
      for (let i = 0; i < count; i++) {
        const result = await client.query(
          `INSERT INTO feed_items (
            feed_config_id,
            title,
            description,
            content,
            url,
            guid,
            author,
            categories,
            published_at,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *`,
          [
            feedId,
            `Test Item ${i + 1}`,
            `Test Description ${i + 1}`,
            `Test Content ${i + 1}`,
            `https://example.com/item-${i + 1}`,
            `guid-${i + 1}`,
            'Test Author',
            ['test', 'category']
          ]
        );
        items.push(result.rows[0]);
      }
      return items;
    });
  }

  async createFeedConfig(userId: number, overrides: Partial<FeedConfig> = {}): Promise<FeedConfig> {
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

  async createFeedHealth(feedConfigId: number, data: Partial<{
    lastCheckAt: Date;
    lastErrorAt: Date;
    lastErrorCategory: string;
    lastErrorDetail: string;
    consecutiveFailures: number;
    isPermanentlyInvalid: boolean;
    requiresSpecialHandling: boolean;
    specialHandlerType: string;
  }> = {}): Promise<{ id: number }> {
    return this.withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO feed_health (
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING id`,
        [
          feedConfigId,
          data.lastCheckAt || new Date(),
          data.lastErrorAt || null,
          data.lastErrorCategory || null,
          data.lastErrorDetail || null,
          data.consecutiveFailures || 0,
          data.isPermanentlyInvalid || false,
          data.requiresSpecialHandling || false,
          data.specialHandlerType || null
        ]
      );
      return { id: result.rows[0].id };
    });
  }

  async createAuthTestData(): Promise<{ user: User }> {
    return this.withTransaction(async (client) => {
      const timestamp = Date.now();
      const email = `test-user-${timestamp}@example.com`;
      const googleId = `test-google-id-${timestamp}`;

      // Create user
      const userResult = await client.one<User>(
        `INSERT INTO users (
          email,
          google_id,
          display_name,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *`,
        [email, googleId, `Test User ${timestamp}`]
      );

      // Create default preferences
      await client.query(
        `INSERT INTO user_preferences (
          user_id,
          theme,
          email_notifications,
          content_language,
          summary_level,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userResult.id, 'light', true, 'en', 1]
      );

      return { user: userResult };
    });
  }

  public reset(): void {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Resets the TestDataFactory instance's database connection if needed
   */
  public async resetConnection(): Promise<void> {
    try {
      this.db = await this.connectionManager.getHealthyConnection(this.suiteId);
      logger.info('TestDataFactory database connection reset successfully');
    } catch (error) {
      logger.error('Failed to reset TestDataFactory database connection:', error);
      throw error;
    }
  }
} 