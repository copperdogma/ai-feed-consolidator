import { IDatabase } from 'pg-promise';
import { FeedConfig } from '../models/feed-config.model';
import { IServiceContainer } from './service-container.interface';
import { logger } from '../logger';

export class FeedConfigService {
  private pool: IDatabase<any>;
  private container: IServiceContainer;

  constructor(container: IServiceContainer) {
    this.container = container;
    this.pool = container.getPool();
  }

  async getFeedConfig(id: number): Promise<FeedConfig | null> {
    try {
      const result = await this.pool.oneOrNone<FeedConfig>(
        'SELECT * FROM feed_configs WHERE id = $1',
        [id]
      );
      return result;
    } catch (error) {
      logger.error('Error getting feed config:', error);
      throw error;
    }
  }

  async getFeedConfigs(userId: number): Promise<FeedConfig[]> {
    try {
      const result = await this.pool.manyOrNone<FeedConfig>(
        'SELECT * FROM feed_configs WHERE user_id = $1',
        [userId]
      );
      return result;
    } catch (error) {
      logger.error('Error getting feed configs:', error);
      throw error;
    }
  }

  async createFeedConfig(config: Omit<FeedConfig, 'id' | 'created_at' | 'updated_at'>): Promise<FeedConfig> {
    try {
      const result = await this.pool.one<FeedConfig>(
        `INSERT INTO feed_configs (
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          config.user_id,
          config.feed_url,
          config.feed_type,
          config.title,
          config.description,
          config.site_url,
          config.icon_url,
          config.is_active,
          config.fetch_interval_minutes
        ]
      );
      return result;
    } catch (error) {
      logger.error('Error creating feed config:', error);
      throw error;
    }
  }

  async updateFeedConfig(id: number, updates: Partial<FeedConfig>): Promise<FeedConfig> {
    try {
      // Validate fetch_interval_minutes
      if (updates.fetch_interval_minutes !== undefined && updates.fetch_interval_minutes < 0) {
        throw new Error('Validation error: fetch_interval_minutes must be a positive number');
      }

      // Check if feed config exists first
      const exists = await this.pool.oneOrNone(
        'SELECT id FROM feed_configs WHERE id = $1',
        [id]
      );

      if (!exists) {
        throw new Error(`Feed config not found: ${id}`);
      }

      const result = await this.pool.one<FeedConfig>(
        `UPDATE feed_configs
         SET ${Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ')},
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, ...Object.values(updates)]
      );
      return result;
    } catch (error) {
      logger.error('Error updating feed config:', error);
      throw error;
    }
  }

  async deleteFeedConfig(id: number): Promise<void> {
    try {
      // Check if feed config exists first
      const exists = await this.pool.oneOrNone(
        'SELECT id FROM feed_configs WHERE id = $1',
        [id]
      );

      if (!exists) {
        throw new Error(`Feed config not found: ${id}`);
      }

      await this.pool.none(
        'DELETE FROM feed_configs WHERE id = $1',
        [id]
      );
    } catch (error) {
      logger.error('Error deleting feed config:', error);
      throw error;
    }
  }

  async toggleFeedActive(id: number): Promise<FeedConfig> {
    try {
      const result = await this.pool.one<FeedConfig>(
        `UPDATE feed_configs
         SET is_active = NOT is_active,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      return result;
    } catch (error) {
      logger.error('Error toggling feed active state:', error);
      throw error;
    }
  }
} 