import { logger } from '../logger';
import { RSSService } from '../services/rss/rss-service';
import { getServiceContainer } from '../services/service-container';
import { Pool } from 'pg';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export class FeedPoller {
  private readonly rssService: RSSService;
  private pollInterval?: NodeJS.Timeout;

  constructor() {
    const container = getServiceContainer();
    this.rssService = container.getService<RSSService>('rssService');
  }

  /**
   * Start the feed polling job
   */
  start(): void {
    logger.info('Starting feed polling job');
    
    // Poll immediately on start
    this.pollFeeds().catch(error => {
      logger.error({ error }, 'Error in initial feed poll');
    });

    // Then poll periodically
    this.pollInterval = setInterval(() => {
      this.pollFeeds().catch(error => {
        logger.error({ error }, 'Error in periodic feed poll');
      });
    }, POLL_INTERVAL_MS);
  }

  /**
   * Stop the feed polling job
   */
  stop(): void {
    logger.info('Stopping feed polling job');
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  /**
   * Poll all active feeds
   */
  private async pollFeeds(): Promise<void> {
    const startTime = Date.now();
    logger.info('Starting feed poll');

    try {
      // Check if we have any feeds in the database before proceeding
      const hasFeeds = await this.checkIfFeedsExist();
      
      if (!hasFeeds) {
        logger.info('No feeds found in database, skipping feed poll');
        return;
      }
      
      // Proceed with updating feeds
      await this.rssService.updateFeeds();
      
      const duration = Date.now() - startTime;
      logger.info({ durationMs: duration }, 'Feed poll completed');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { error, durationMs: duration },
        'Feed poll failed'
      );
      // Don't throw the error, just log it
      // This prevents the error from bubbling up and causing the feed polling job to stop
    }
  }
  
  /**
   * Check if there are any feeds in the database
   * This is a simple check to avoid unnecessary polling when the database is empty
   */
  private async checkIfFeedsExist(): Promise<boolean> {
    try {
      // Get the database pool directly instead of using transaction manager
      const container = getServiceContainer();
      const pool = container.getService<Pool>('pool');
      
      if (!pool) {
        logger.error('Database pool not available');
        return false;
      }
      
      // Use a simple query to check if feeds exist
      const result = await pool.query('SELECT COUNT(*) FROM feed_configs LIMIT 1');
      
      // Add proper null checks
      if (!result || !result.rows || result.rows.length === 0) {
        logger.info('No result returned from feed count query');
        return false;
      }
      
      // Log the result structure for debugging
      logger.debug({ resultStructure: JSON.stringify(result.rows[0]) }, 'Feed count query result');
      
      // Get the first row
      const firstRow = result.rows[0];
      if (!firstRow) {
        logger.info('No result returned from feed count query');
        return false;
      }
      
      // Get the first property value from the row object
      // Make sure we have values to extract
      if (!Object.values(firstRow).length) {
        logger.info('No values in the result row');
        return false;
      }
      
      const count = parseInt(Object.values(firstRow)[0] as string || '0', 10);
      return count > 0;
    } catch (error) {
      // Log the detailed error for debugging
      if (error instanceof Error) {
        logger.error({ 
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack
          }
        }, 'Error checking if feeds exist');
      } else {
        logger.error({ error }, 'Error checking if feeds exist');
      }
      
      // If there's an error, assume no feeds exist to be safe
      return false;
    }
  }
} 