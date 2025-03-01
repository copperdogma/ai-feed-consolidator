import { Pool } from 'pg';
import { logger } from '../../logger';
import { ErrorCategory, FeedHealthUpdate } from '../../../types/feed-health';
import { FeedInfo } from '../../../types/feed-health';
import { IServiceContainer } from '../service-container.interface';
import { FeedHealth } from '../../types/feed';
import { TransactionManager } from '../transaction-manager';
import { IDatabase } from 'pg-promise';

export interface RSSFeedConfig {
  id: number;
  userId: number;
  feedUrl: string;
  title?: string;
  description?: string;
  siteUrl?: string;
  iconUrl?: string;
  lastFetchedAt?: Date;
  errorCount: number;
  isActive: boolean;
  fetchIntervalMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalFeedItem {
  id?: number;
  feed_config_id: number;
  guid: string;
  title: string;
  url: string;
  description: string;
  content: string;
  author: string;
  categories: string[];
  published_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface FeedItem {
  id: number;
  feed_config_id: number;
  guid: string;
  title: string;
  url: string;
  description: string | null;
  content: string | null;
  author: string | null;
  categories: string[] | null;
  published_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class FeedRepository {
  private logger = console;
  private pool: IDatabase<any>;
  private transactionManager: TransactionManager;

  constructor(private serviceContainer: IServiceContainer) {
    this.pool = serviceContainer.get('databasePool');
    this.transactionManager = serviceContainer.getService<TransactionManager>('transactionManager');
  }

  /**
   * Add a new RSS feed for a user
   */
  async addFeed(userId: number, feedUrl: string, feedInfo?: FeedInfo): Promise<RSSFeedConfig> {
    try {
      return await this.transactionManager.withWriteTransaction(async (client) => {
        // Verify user exists
        const userResult = await client.query(
          'SELECT id FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }

        // Create the feed config
        const result = await client.query<RSSFeedConfig>(
          `INSERT INTO feed_configs (
            user_id, feed_url, title, description, site_url, 
            error_count, error_category, feed_type, is_active,
            fetch_interval_minutes
          )
          VALUES ($1, $2, $3, $4, $5, 0, NULL, 'rss', true, 60)
          RETURNING id, user_id as "userId", feed_url as "feedUrl", title, description, 
          site_url as "siteUrl", icon_url as "iconUrl", last_fetched_at as "lastFetchedAt",
          error_count as "errorCount", is_active as "isActive", 
          fetch_interval_minutes as "fetchIntervalMinutes",
          created_at as "createdAt", updated_at as "updatedAt"`,
          [
            userId,
            feedUrl,
            feedInfo?.title || null,
            feedInfo?.description || null,
            feedInfo?.url || null
          ]
        );

        return result.rows[0];
      });
    } catch (error) {
      logger.error({ error, userId, feedUrl }, 'Error adding feed');
      throw error;
    }
  }

  /**
   * Get a feed by its ID without requiring user ID
   */
  async getFeedById(feedId: number): Promise<RSSFeedConfig | null> {
    const feeds = await this.fetchFeeds('WHERE id = $1', [feedId]);
    return feeds[0] || null;
  }

  /**
   * Get a specific feed for a user
   */
  async getFeed(userId: number, feedId: number): Promise<RSSFeedConfig | null> {
    const feeds = await this.fetchFeeds('WHERE user_id = $1 AND id = $2', [userId, feedId]);
    return feeds[0] || null;
  }

  /**
   * Get all active feeds for a user
   */
  async getUserFeeds(userId: number): Promise<RSSFeedConfig[]> {
    return this.fetchFeeds('WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  }

  /**
   * Get feeds that are due for update
   */
  async getFeedsDueForUpdate(): Promise<RSSFeedConfig[]> {
    return this.fetchFeeds(
      `WHERE is_active = true
       AND (
         last_fetched_at IS NULL
         OR last_fetched_at < NOW() - (COALESCE(fetch_interval_minutes, 60) || ' minutes')::interval
       )
       AND (
         NOT EXISTS (
           SELECT 1 FROM feed_health
           WHERE feed_health.feed_config_id = feed_configs.id
           AND feed_health.is_permanently_invalid = true
         )
       )`
    );
  }

  /**
   * Update feed health status
   */
  async updateFeedHealth(feedId: number, update: FeedHealthUpdate): Promise<FeedHealth> {
    try {
      return await this.transactionManager.withWriteTransaction(async (client) => {
        // First get the feed URL to determine if it requires special handling
        const feedResult = await client.query(
          'SELECT feed_url FROM feed_configs WHERE id = $1',
          [feedId]
        );
        
        const feedUrl = feedResult.rows[0]?.feed_url;
        const requiresSpecialHandling = feedUrl?.includes('kijiji.ca') || false;
        const specialHandlerType = requiresSpecialHandling ? 'KIJIJI' : null;

        const query = `
          WITH upsert AS (
            UPDATE feed_health
            SET last_check_at = NOW(),
                consecutive_failures = CASE
                  WHEN $2::text IS NOT NULL THEN COALESCE(consecutive_failures, 0) + 1
                  ELSE 0
                END,
                last_error_category = $3,
                last_error_detail = $2,
                is_permanently_invalid = $4,
                requires_special_handling = $5,
                special_handler_type = $6,
                updated_at = NOW()
            WHERE feed_config_id = $1
            RETURNING *
          ),
          insert_if_not_exists AS (
            INSERT INTO feed_health (
              feed_config_id,
              last_check_at,
              consecutive_failures,
              last_error_category,
              last_error_detail,
              is_permanently_invalid,
              requires_special_handling,
              special_handler_type
            )
            SELECT
              $1,
              NOW(),
              CASE WHEN $2::text IS NOT NULL THEN 1 ELSE 0 END,
              $3,
              $2,
              $4,
              $5,
              $6
            WHERE NOT EXISTS (SELECT 1 FROM upsert)
            RETURNING *
          )
          SELECT * FROM upsert
          UNION ALL
          SELECT * FROM insert_if_not_exists`;

        const result = await client.query(query, [
          feedId,
          update.lastError,
          update.errorCategory,
          update.isPermanentlyInvalid,
          requiresSpecialHandling,
          specialHandlerType
        ]);

        return result.rows[0];
      });
    } catch (error) {
      logger.error('Error updating feed health', {
        feedId,
        update,
        error
      });
      throw error;
    }
  }

  /**
   * Update feed metadata after successful fetch
   */
  async updateFeedMetadata(feedId: number, feedInfo: FeedInfo): Promise<void> {
    try {
      await this.transactionManager.withWriteTransaction(async (client) => {
        await client.query(
          `UPDATE feed_configs 
           SET title = $1,
               description = $2,
               site_url = $3,
               last_fetched_at = CURRENT_TIMESTAMP,
               error_count = 0,
               updated_at = NOW()
           WHERE id = $4`,
          [feedInfo.title || '', feedInfo.description || '', feedInfo.url || '', feedId]
        );

        // Reset feed health on successful update
        await client.query(`
          UPDATE feed_health
          SET consecutive_failures = 0,
              last_error_category = NULL,
              last_error_detail = NULL,
              last_check_at = NOW()
          WHERE feed_config_id = $1
        `, [feedId]);
      });
    } catch (error) {
      logger.error('Error updating feed metadata', {
        feedId,
        error
      });
      throw error;
    }
  }

  /**
   * Save feed items to the database
   */
  async saveFeedItems(feedId: number, items: LocalFeedItem[]): Promise<FeedItem[]> {
    return this.transactionManager.withWriteTransaction(async (client) => {
      const query = `
        WITH insert_if_not_exists AS (
          INSERT INTO feed_items (
            feed_config_id, guid, title, url, description,
            content, author, categories, published_at,
            created_at, updated_at
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (feed_config_id, guid) 
          DO UPDATE SET
            title = EXCLUDED.title,
            url = EXCLUDED.url,
            description = EXCLUDED.description,
            content = EXCLUDED.content,
            author = EXCLUDED.author,
            categories = EXCLUDED.categories,
            published_at = EXCLUDED.published_at,
            updated_at = NOW()
          RETURNING *
        )
        SELECT * FROM insert_if_not_exists`;

      const savedItems = await Promise.all(
        items.map(async (item) => {
          const result = await client.query(query, [
            feedId,
            item.guid,
            item.title,
            item.url,
            item.description,
            item.content,
            item.author,
            item.categories,
            item.published_at
          ]);
          return result.rows[0];
        })
      );

      return savedItems;
    });
  }

  /**
   * Helper method to fetch feeds with a WHERE clause
   */
  private async fetchFeeds(whereClause: string, params: any[] = []): Promise<RSSFeedConfig[]> {
    try {
      const result = await this.transactionManager.withReadTransaction(async (client) => {
        return await client.query<RSSFeedConfig>(
          `SELECT id,
                  user_id as "userId",
                  feed_url as "feedUrl",
                  title,
                  description,
                  site_url as "siteUrl",
                  icon_url as "iconUrl",
                  last_fetched_at as "lastFetchedAt",
                  error_count,
                  is_active as "isActive",
                  fetch_interval_minutes as "fetchIntervalMinutes",
                  created_at as "createdAt",
                  updated_at as "updatedAt"
           FROM feed_configs ${whereClause}`,
          params
        );
      });
      return result.rows;
    } catch (error) {
      logger.error({ error, whereClause, params }, 'Error fetching feeds');
      // Return an empty array instead of throwing an error when no feeds are found
      // This prevents errors when there are no feeds to update
      return [];
    }
  }

  /**
   * Update feed configuration
   */
  async updateFeedConfig(
    feedId: number, 
    updates: Partial<Pick<RSSFeedConfig, 'isActive' | 'fetchIntervalMinutes'>>
  ): Promise<void> {
    try {
      await this.transactionManager.withWriteTransaction(async (client) => {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.isActive !== undefined) {
          updateFields.push(`is_active = $${paramIndex}`);
          values.push(updates.isActive);
          paramIndex++;
        }

        if (updates.fetchIntervalMinutes !== undefined) {
          updateFields.push(`fetch_interval_minutes = $${paramIndex}`);
          values.push(updates.fetchIntervalMinutes);
          paramIndex++;
        }

        if (updateFields.length === 0) {
          return;
        }

        values.push(feedId);

        await client.query(
          `UPDATE feed_configs 
           SET ${updateFields.join(', ')}, updated_at = NOW()
           WHERE id = $${paramIndex}`,
          values
        );
      });
    } catch (error) {
      logger.error({ error, feedId, updates }, 'Error updating feed config');
      throw error;
    }
  }

  /**
   * Reset the last fetched timestamp to force an immediate update
   */
  async resetLastFetchedAt(feedId: number): Promise<void> {
    try {
      await this.transactionManager.withWriteTransaction(async (client) => {
        await client.query(
          'UPDATE feed_configs SET last_fetched_at = NULL WHERE id = $1',
          [feedId]
        );
      });
    } catch (error) {
      logger.error({ error, feedId }, 'Error resetting last fetched timestamp');
      throw error;
    }
  }
} 