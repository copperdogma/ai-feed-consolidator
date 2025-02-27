import { logger } from '../logger';
import { RSSService } from '../services/rss/rss-service';
import { getServiceContainer } from '../services/service-container';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export class FeedPoller {
  private readonly rssService: RSSService;
  private pollInterval?: NodeJS.Timeout;

  constructor() {
    this.rssService = getServiceContainer().getService<RSSService>('rssService');
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
      await this.rssService.updateFeeds();
      
      const duration = Date.now() - startTime;
      logger.info({ durationMs: duration }, 'Feed poll completed');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { error, durationMs: duration },
        'Feed poll failed'
      );
      throw error;
    }
  }
} 