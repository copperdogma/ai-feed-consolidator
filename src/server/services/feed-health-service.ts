import { IDatabase } from 'pg-promise';
import { FeedHealth } from '../models/feed-config.model';
import { IServiceContainer } from './service-container.interface';
import { logger } from '../logger';

export class FeedHealthService {
  private pool: IDatabase<any>;
  private container: IServiceContainer;

  constructor(container: IServiceContainer) {
    this.container = container;
    this.pool = container.getPool();
  }

  async getFeedHealth(feedConfigId: number): Promise<FeedHealth | null> {
    try {
      const result = await this.pool.oneOrNone<FeedHealth>(
        'SELECT * FROM feed_health WHERE feed_config_id = $1',
        [feedConfigId]
      );
      return result;
    } catch (error) {
      logger.error('Error getting feed health:', error);
      throw error;
    }
  }

  async createFeedHealth(feedHealth: Omit<FeedHealth, 'created_at' | 'updated_at'>): Promise<FeedHealth> {
    try {
      const result = await this.pool.one<FeedHealth>(
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          feedHealth.feed_config_id,
          feedHealth.last_check_at,
          feedHealth.last_error_at,
          feedHealth.last_error_category,
          feedHealth.last_error_detail,
          feedHealth.consecutive_failures,
          feedHealth.is_permanently_invalid,
          feedHealth.requires_special_handling,
          feedHealth.special_handler_type
        ]
      );
      return result;
    } catch (error) {
      logger.error('Error creating feed health:', error);
      throw error;
    }
  }

  async updateFeedHealth(feedConfigId: number, updates: Partial<FeedHealth>): Promise<FeedHealth> {
    try {
      // First check if the record exists
      const exists = await this.pool.oneOrNone(
        'SELECT 1 FROM feed_health WHERE feed_config_id = $1',
        [feedConfigId]
      );

      // If the record doesn't exist, create it first with default values
      if (!exists) {
        return this.createFeedHealth({
          feed_config_id: feedConfigId,
          last_check_at: new Date(),
          last_error_at: null,
          last_error_category: updates.last_error_category ?? null,
          last_error_detail: updates.last_error_detail ?? null,
          consecutive_failures: updates.consecutive_failures ?? 0,
          is_permanently_invalid: updates.is_permanently_invalid ?? false,
          requires_special_handling: updates.requires_special_handling ?? false,
          special_handler_type: updates.special_handler_type ?? null
        });
      }

      // Otherwise update the existing record
      const updateFields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
      const result = await this.pool.one<FeedHealth>(
        `UPDATE feed_health
         SET ${updateFields},
             updated_at = NOW()
         WHERE feed_config_id = $1
         RETURNING *`,
        [feedConfigId, ...Object.values(updates)]
      );
      return result;
    } catch (error) {
      logger.error('Error updating feed health:', error);
      throw error;
    }
  }

  async recordFeedError(
    feedConfigId: number,
    errorCategory: string,
    errorDetail: string
  ): Promise<FeedHealth> {
    try {
      const result = await this.pool.one<FeedHealth>(
        `UPDATE feed_health
         SET last_error_at = NOW(),
             last_error_category = $2,
             last_error_detail = $3,
             consecutive_failures = consecutive_failures + 1,
             updated_at = NOW()
         WHERE feed_config_id = $1
         RETURNING *`,
        [feedConfigId, errorCategory, errorDetail]
      );
      return result;
    } catch (error) {
      logger.error('Error recording feed error:', error);
      throw error;
    }
  }

  async resetFeedErrors(feedConfigId: number): Promise<FeedHealth> {
    try {
      const result = await this.pool.one<FeedHealth>(
        `UPDATE feed_health
         SET last_error_at = NULL,
             last_error_category = NULL,
             last_error_detail = NULL,
             consecutive_failures = 0,
             updated_at = NOW()
         WHERE feed_config_id = $1
         RETURNING *`,
        [feedConfigId]
      );
      return result;
    } catch (error) {
      logger.error('Error resetting feed errors:', error);
      throw error;
    }
  }

  async markFeedAsPermanentlyInvalid(feedConfigId: number, reason: string): Promise<FeedHealth> {
    try {
      const result = await this.pool.one<FeedHealth>(
        `UPDATE feed_health
         SET is_permanently_invalid = true,
             last_error_at = NOW(),
             last_error_category = 'PERMANENT_FAILURE',
             last_error_detail = $2,
             updated_at = NOW()
         WHERE feed_config_id = $1
         RETURNING *`,
        [feedConfigId, reason]
      );
      return result;
    } catch (error) {
      logger.error('Error marking feed as permanently invalid:', error);
      throw error;
    }
  }

  async setSpecialHandling(
    feedConfigId: number,
    requiresSpecialHandling: boolean,
    handlerType: string | null = null
  ): Promise<FeedHealth> {
    try {
      const result = await this.pool.one<FeedHealth>(
        `UPDATE feed_health
         SET requires_special_handling = $2,
             special_handler_type = $3,
             updated_at = NOW()
         WHERE feed_config_id = $1
         RETURNING *`,
        [feedConfigId, requiresSpecialHandling, handlerType]
      );
      return result;
    } catch (error) {
      logger.error('Error setting special handling:', error);
      throw error;
    }
  }

  async updateLastCheckTime(feedConfigId: number): Promise<FeedHealth> {
    try {
      const result = await this.pool.one<FeedHealth>(
        `UPDATE feed_health
         SET last_check_at = NOW(),
             updated_at = NOW()
         WHERE feed_config_id = $1
         RETURNING *`,
        [feedConfigId]
      );
      return result;
    } catch (error) {
      logger.error('Error updating last check time:', error);
      throw error;
    }
  }
} 