import { Pool } from 'pg';
import { IServiceContainer } from './service-container.interface';
import { logger } from '../logger';

export interface FeedConfig {
  id: number;
  userId: number;
  feedUrl: string;
  isActive: boolean;
  lastFetchAt?: Date;
  fetchIntervalMinutes?: number;
}

export class FeedConfigService {
  private pool: Pool;
  private static instance: FeedConfigService | null = null;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = serviceContainer.getPool();
  }

  async getFeedConfig(id: number): Promise<FeedConfig | null> {
    try {
      const result = await this.pool.query<FeedConfig>(
        'SELECT * FROM feed_configs WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting feed config:', error);
      throw error;
    }
  }

  async getFeedConfigs(userId: number): Promise<FeedConfig[]> {
    try {
      const result = await this.pool.query<FeedConfig>(
        'SELECT * FROM feed_configs WHERE user_id = $1',
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting feed configs:', error);
      throw error;
    }
  }

  async createFeedConfig(config: Omit<FeedConfig, 'id'>): Promise<FeedConfig> {
    try {
      const result = await this.pool.query<FeedConfig>(
        `INSERT INTO feed_configs (
          user_id,
          feed_url,
          feed_type,
          title,
          description,
          site_url,
          icon_url,
          is_active,
          last_fetched_at,
          fetch_interval_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          config.user_id,
          config.feed_url,
          config.feed_type || 'RSS',
          config.title || null,
          config.description || null,
          config.site_url || null,
          config.icon_url || null,
          config.is_active ?? true,
          config.last_fetched_at || null,
          config.fetch_interval_minutes || 60
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating feed config:', error);
      throw error;
    }
  }

  async updateFeedConfig(id: number, updates: Partial<FeedConfig>): Promise<FeedConfig | null> {
    try {
      const setClauses = [];
      const values: (number | string | boolean | Date | null)[] = [id];
      let paramIndex = 2;

      if ('user_id' in updates && updates.user_id !== undefined) {
        setClauses.push(`user_id = $${paramIndex++}`);
        values.push(updates.user_id);
      }
      if ('feed_url' in updates && updates.feed_url !== undefined) {
        setClauses.push(`feed_url = $${paramIndex++}`);
        values.push(updates.feed_url);
      }
      if ('feed_type' in updates && updates.feed_type !== undefined) {
        setClauses.push(`feed_type = $${paramIndex++}`);
        values.push(updates.feed_type);
      }
      if ('title' in updates && updates.title !== undefined) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }
      if ('description' in updates && updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if ('site_url' in updates && updates.site_url !== undefined) {
        setClauses.push(`site_url = $${paramIndex++}`);
        values.push(updates.site_url);
      }
      if ('icon_url' in updates && updates.icon_url !== undefined) {
        setClauses.push(`icon_url = $${paramIndex++}`);
        values.push(updates.icon_url);
      }
      if ('is_active' in updates && updates.is_active !== undefined) {
        setClauses.push(`is_active = $${paramIndex++}`);
        values.push(updates.is_active);
      }
      if ('last_fetched_at' in updates) {
        setClauses.push(`last_fetched_at = $${paramIndex++}`);
        values.push(updates.last_fetched_at || null);
      }
      if ('fetch_interval_minutes' in updates) {
        setClauses.push(`fetch_interval_minutes = $${paramIndex++}`);
        values.push(updates.fetch_interval_minutes || null);
      }
      if ('error_count' in updates) {
        setClauses.push(`error_count = $${paramIndex++}`);
        values.push(updates.error_count || 0);
      }
      if ('error_category' in updates) {
        setClauses.push(`error_category = $${paramIndex++}`);
        values.push(updates.error_category || null);
      }
      if ('last_error' in updates) {
        setClauses.push(`last_error = $${paramIndex++}`);
        values.push(updates.last_error || null);
      }

      if (setClauses.length === 0) {
        return null;
      }

      const result = await this.pool.query<FeedConfig>(
        `UPDATE feed_configs SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        values
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating feed config:', error);
      throw error;
    }
  }

  async deleteFeedConfig(id: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'DELETE FROM feed_configs WHERE id = $1 RETURNING id',
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error deleting feed config:', error);
      throw error;
    }
  }
} 