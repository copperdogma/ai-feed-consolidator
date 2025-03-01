import { Pool } from 'pg';
import { FeedItem } from '../types/feed';
import { User } from './db';
import { logger } from '../logger';
import { IServiceContainer } from './service-container.interface';

export class FeedItemService {
  private pool: Pool;
  private static instance: FeedItemService | null = null;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = serviceContainer.getPool();
  }

  /**
   * Get a feed item by its source ID and type
   */
  async getBySourceId(sourceType: string, sourceId: string): Promise<FeedItem | null> {
    const result = await this.pool.query(
      `SELECT f.*, p.processed_summary, p.content_type, p.time_sensitive, 
              p.required_background, p.consumption_time_minutes, p.consumption_type,
              f.id::text as db_id
       FROM feed_items f
       LEFT JOIN processed_items p ON p.feed_item_id = f.id
       WHERE f.source_type = $1 AND f.source_id = $2`,
      [sourceType, sourceId]
    );

    if (!result.rows[0]) return null;

    // Convert numeric id to string
    const item = result.rows[0];
    item.id = item.db_id;
    delete item.db_id;

    return item;
  }

  /**
   * Create or update a feed item
   */
  async upsertFeedItem(item: FeedItem): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert feed item
      const feedResult = await client.query(
        `INSERT INTO feed_items (
          source_id, source_type, title, author, content, summary, url,
          published_at, crawled_at, engagement_score, raw_metadata, feed_config_id,
          source_url, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (source_type, source_id) DO UPDATE SET
          title = EXCLUDED.title,
          author = EXCLUDED.author,
          content = EXCLUDED.content,
          summary = EXCLUDED.summary,
          url = EXCLUDED.url,
          published_at = EXCLUDED.published_at,
          crawled_at = EXCLUDED.crawled_at,
          engagement_score = EXCLUDED.engagement_score,
          raw_metadata = EXCLUDED.raw_metadata,
          feed_config_id = EXCLUDED.feed_config_id,
          source_url = EXCLUDED.source_url,
          image_url = EXCLUDED.image_url,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id::text`,
        [
          item.sourceId,
          item.source.platform,
          item.title,
          item.author,
          item.content,
          item.summary,
          item.url,
          item.publishedAt,
          new Date(),
          item.engagement?.score || 0,
          JSON.stringify(item.metadata),
          item.feedConfigId,
          item.sourceUrl,
          item.imageUrl
        ]
      );

      const feedItemId = feedResult.rows[0].id;

      // If we have processed content, upsert it
      if (item.processedSummary) {
        await client.query(
          `INSERT INTO processed_items (
            feed_item_id, processed_summary, content_type, time_sensitive,
            required_background, consumption_time_minutes, consumption_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (feed_item_id, version) DO UPDATE SET
            processed_summary = EXCLUDED.processed_summary,
            content_type = EXCLUDED.content_type,
            time_sensitive = EXCLUDED.time_sensitive,
            required_background = EXCLUDED.required_background,
            consumption_time_minutes = EXCLUDED.consumption_time_minutes,
            consumption_type = EXCLUDED.consumption_type`,
          [
            feedItemId,
            item.processedSummary,
            item.contentType,
            item.timeSensitive,
            item.requiredBackground,
            item.consumptionTime?.minutes,
            item.consumptionTime?.type
          ]
        );
      }

      await client.query('COMMIT');
      return feedItemId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get item state for a user
   */
  async getItemState(userId: number, feedItemId: string): Promise<{ isRead: boolean; isSaved: boolean } | null> {
    const result = await this.pool.query(
      'SELECT is_read, is_saved FROM item_states WHERE user_id = $1 AND feed_item_id = $2::integer',
      [userId, feedItemId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update item state for a user
   */
  async updateItemState(
    userId: number,
    feedItemId: string,
    state: { isRead?: boolean; isSaved?: boolean }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [userId, feedItemId];
    let paramIndex = 3;

    if (state.isRead !== undefined) {
      updates.push(`is_read = $${paramIndex}`);
      values.push(state.isRead);
      paramIndex++;
    }

    if (state.isSaved !== undefined) {
      updates.push(`is_saved = $${paramIndex}`);
      values.push(state.isSaved);
      paramIndex++;
    }

    if (updates.length === 0) return;

    await this.pool.query(
      `INSERT INTO item_states (user_id, feed_item_id, ${state.isRead !== undefined ? 'is_read, ' : ''}${
        state.isSaved !== undefined ? 'is_saved, ' : ''
      }last_synced_at)
       VALUES ($1, $2::integer, ${state.isRead !== undefined ? `$3, ` : ''}${
         state.isSaved !== undefined ? `$${paramIndex - 1}, ` : ''
       }CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, feed_item_id) DO UPDATE SET
         ${updates.join(', ')},
         last_synced_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      values
    );
  }

  /**
   * Get all saved items for a user
   */
  async getSavedItems(userId: number, limit = 20): Promise<FeedItem[]> {
    const result = await this.pool.query(
      `SELECT f.*, f.id::text as db_id, 
              p.processed_summary, p.content_type, p.time_sensitive,
              p.required_background, p.consumption_time_minutes, p.consumption_type,
              s.is_read, s.is_saved
       FROM feed_items f
       INNER JOIN item_states s ON s.feed_item_id = f.id
       LEFT JOIN processed_items p ON p.feed_item_id = f.id
       WHERE s.user_id = $1 AND s.is_saved = true
       ORDER BY f.published_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    // Convert numeric ids to strings
    return result.rows.map(row => {
      row.id = row.db_id;
      delete row.db_id;
      return row;
    });
  }

  /**
   * Record a sync attempt
   */
  async recordSync(userId: number, type: string, itemCount: number, success: boolean, error?: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO sync_history (
        user_id, sync_type, items_synced, success, error_message, completed_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId, type, itemCount, success, error || null]
    );
  }

  /**
   * Get items for a specific feed
   */
  async getFeedItems(feedId: number, limit = 50): Promise<FeedItem[]> {
    const result = await this.pool.query(
      `SELECT f.*, f.id::text as db_id, 
              p.processed_summary, p.content_type, p.time_sensitive,
              p.required_background, p.consumption_time_minutes, p.consumption_type,
              s.is_read, s.is_saved
       FROM feed_items f
       LEFT JOIN processed_items p ON p.feed_item_id = f.id
       LEFT JOIN item_states s ON s.feed_item_id = f.id
       WHERE f.feed_config_id = $1
       ORDER BY f.published_at DESC
       LIMIT $2`,
      [feedId, limit]
    );

    // Convert numeric ids to strings
    return result.rows.map(row => {
      row.id = row.db_id;
      delete row.db_id;
      return row;
    });
  }
} 