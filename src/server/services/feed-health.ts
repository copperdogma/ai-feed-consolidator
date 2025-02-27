import { Pool } from 'pg';
import { IServiceContainer } from './service-container.interface';
import { logger } from '../logger';
import { ErrorCategory, SpecialHandlerType, FeedHealth } from '../../types/feed-health';
import { TransactionManager } from './transaction-manager';

export class FeedHealthService {
  private pool: Pool;
  private transactionManager: TransactionManager;
  private static instance: FeedHealthService | null = null;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = serviceContainer.getPool();
    this.transactionManager = serviceContainer.getService<TransactionManager>('transactionManager');
  }

  /**
   * Create or update feed health record
   */
  async updateFeedHealth(
    feedConfigId: number,
    params: {
      error_category?: ErrorCategory;
      error_detail?: string;
      is_permanently_invalid?: boolean;
      requires_special_handling?: boolean;
      special_handler_type?: SpecialHandlerType;
    }
  ): Promise<FeedHealth> {
    // Ensure feedConfigId is a valid number
    const numericFeedConfigId = Number(feedConfigId);
    if (isNaN(numericFeedConfigId)) {
      logger.error('Invalid feed config ID:', feedConfigId);
      throw new Error('Invalid feed config ID');
    }

    return this.transactionManager.withWriteTransaction(async (client) => {
      // Verify feed config exists
      const feedConfigExists = await client.query(
        'SELECT EXISTS(SELECT 1 FROM feed_configs WHERE id = $1)',
        [numericFeedConfigId]
      );

      if (!feedConfigExists.rows[0].exists) {
        logger.error(`Feed config with ID ${numericFeedConfigId} not found`);
        throw new Error(`Feed config with ID ${numericFeedConfigId} not found`);
      }

      logger.info(`Updating feed health for config ${numericFeedConfigId}`, { params });

      // Get existing record or create new one
      const existingResult = await client.query(
        'SELECT * FROM feed_health WHERE feed_config_id = $1',
        [numericFeedConfigId]
      );

      let result;
      if (existingResult.rows.length === 0) {
        logger.info(`Creating new feed health record for config ${numericFeedConfigId}`);
        // Create new record
        result = await client.query(
          `INSERT INTO feed_health (
            feed_config_id,
            last_check_at,
            consecutive_failures,
            last_error_category,
            last_error_detail,
            is_permanently_invalid,
            requires_special_handling,
            special_handler_type,
            created_at,
            updated_at
          ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING *`,
          [
            numericFeedConfigId,
            params.error_category ? 1 : 0,
            params.error_category || null,
            params.error_detail || null,
            params.is_permanently_invalid || false,
            params.requires_special_handling || false,
            params.special_handler_type || null
          ]
        );
      } else {
        logger.info(`Updating existing feed health record for config ${numericFeedConfigId}`);
        // Update existing record
        const currentRecord = existingResult.rows[0];
        
        // Determine if this is a new error or success
        const isNewError = params.error_category !== undefined;
        const isSuccess = !isNewError;
        
        // Calculate consecutive failures
        let consecutiveFailures = currentRecord.consecutive_failures;
        if (isSuccess) {
          consecutiveFailures = 0;
        } else if (isNewError) {
          consecutiveFailures++;
        }
        
        // Determine permanent invalid status
        const isPermanentlyInvalid = params.is_permanently_invalid === true || 
          currentRecord.is_permanently_invalid;
          
        // Determine special handling
        const requiresSpecialHandling = params.requires_special_handling === true ||
          currentRecord.requires_special_handling ||
          params.error_category === 'SSL_ERROR' ||
          params.error_category === 'PARSE_ERROR';
          
        // Update special handler type only if requires_special_handling is true
        const specialHandlerType = requiresSpecialHandling
          ? (params.special_handler_type || currentRecord.special_handler_type)
          : null;
          
        result = await client.query(
          `UPDATE feed_health
           SET last_check_at = NOW(),
               consecutive_failures = CASE
                 WHEN $1::text IS NULL THEN 0  -- Success case
                 ELSE consecutive_failures + 1  -- Error case
               END,
               last_error_at = CASE
                 WHEN $1::text IS NULL THEN NULL
                 ELSE NOW()
               END,
               last_error_category = $1,
               last_error_detail = $2,
               is_permanently_invalid = $3,
               requires_special_handling = $4,
               special_handler_type = $5,
               updated_at = NOW()
           WHERE feed_config_id = $6
           RETURNING *`,
          [
            params.error_category || null,
            params.error_detail || null,
            isPermanentlyInvalid,
            requiresSpecialHandling,
            specialHandlerType,
            numericFeedConfigId
          ]
        );
      }
      
      // Convert the database record to FeedHealth type
      const record = result.rows[0];
      if (!record) {
        logger.error('No record returned after update/insert', { feedConfigId: numericFeedConfigId, params });
        throw new Error('No record returned after update/insert');
      }

      const feedHealth = {
        id: record.id,
        feed_config_id: record.feed_config_id,
        last_check_at: record.last_check_at,
        consecutive_failures: record.consecutive_failures,
        last_error_category: record.last_error_category as ErrorCategory | null,
        last_error_detail: record.last_error_detail,
        is_permanently_invalid: record.is_permanently_invalid,
        requires_special_handling: record.requires_special_handling,
        special_handler_type: record.special_handler_type as SpecialHandlerType | null,
        created_at: record.created_at,
        updated_at: record.updated_at
      };

      logger.info(`Successfully updated feed health for config ${numericFeedConfigId}`, feedHealth);
      return feedHealth;
    });
  }

  /**
   * Get feed health record
   */
  async getFeedHealth(feedConfigId: number): Promise<FeedHealth | null> {
    return this.transactionManager.withReadTransaction(async (client) => {
      const result = await client.query(
        'SELECT * FROM feed_health WHERE feed_config_id = $1',
        [feedConfigId]
      );

      if (result.rows.length === 0) {
        logger.info(`No feed health record found for config ${feedConfigId}`);
        return null;
      }

      const record = result.rows[0];
      const feedHealth = {
        id: record.id,
        feed_config_id: record.feed_config_id,
        last_check_at: record.last_check_at,
        consecutive_failures: record.consecutive_failures,
        last_error_category: record.last_error_category as ErrorCategory | null,
        last_error_detail: record.last_error_detail,
        is_permanently_invalid: record.is_permanently_invalid,
        requires_special_handling: record.requires_special_handling,
        special_handler_type: record.special_handler_type as SpecialHandlerType | null,
        created_at: record.created_at,
        updated_at: record.updated_at
      };

      logger.info(`Retrieved feed health record for config ${feedConfigId}`, feedHealth);
      return feedHealth;
    });
  }

  /**
   * Get all feeds requiring special handling
   */
  async getSpecialHandlingFeeds(): Promise<FeedHealth[]> {
    return this.transactionManager.withReadTransaction(async (client) => {
      const result = await client.query(
        'SELECT * FROM feed_health WHERE requires_special_handling = true'
      );

      const feeds = result.rows.map(record => ({
        id: record.id,
        feed_config_id: record.feed_config_id,
        last_check_at: record.last_check_at,
        consecutive_failures: record.consecutive_failures,
        last_error_category: record.last_error_category as ErrorCategory | null,
        last_error_detail: record.last_error_detail,
        is_permanently_invalid: record.is_permanently_invalid,
        requires_special_handling: record.requires_special_handling,
        special_handler_type: record.special_handler_type as SpecialHandlerType | null,
        created_at: record.created_at,
        updated_at: record.updated_at
      }));

      logger.info(`Found ${feeds.length} feeds requiring special handling`);
      return feeds;
    });
  }

  /**
   * Get all permanently invalid feeds
   */
  async getPermanentlyInvalidFeeds(): Promise<FeedHealth[]> {
    const result = await this.pool.query(
      'SELECT * FROM feed_health WHERE is_permanently_invalid = true'
    );

    const feeds = result.rows.map(record => ({
      id: record.id,
      feed_config_id: record.feed_config_id,
      last_check_at: record.last_check_at,
      consecutive_failures: record.consecutive_failures,
      last_error_category: record.last_error_category as ErrorCategory | null,
      last_error_detail: record.last_error_detail,
      is_permanently_invalid: record.is_permanently_invalid,
      requires_special_handling: record.requires_special_handling,
      special_handler_type: record.special_handler_type as SpecialHandlerType | null,
      created_at: record.created_at,
      updated_at: record.updated_at
    }));

    logger.info(`Found ${feeds.length} permanently invalid feeds`);
    return feeds;
  }
} 