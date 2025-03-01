import { Pool } from 'pg';
import { IServiceContainer } from '../service-container.interface';
import { FeedRepository, RSSFeedConfig, LocalFeedItem } from './feed-repository';
import { RSSFetchError } from './rss-fetcher';
import { RSSParser } from './rss-parser';
import { logger } from '../../logger';
import { ErrorCategory, FeedHealthUpdate } from '../../../types/feed-health';

export class FeedPollingService {
  private pool: Pool;
  private static instance: FeedPollingService | null = null;
  private feedRepository: FeedRepository;
  private rssParser: RSSParser;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = serviceContainer.getPool();
    this.feedRepository = serviceContainer.getService<FeedRepository>('feedRepository');
    this.rssParser = serviceContainer.getService<RSSParser>('rssParser');
  }

  async updateFeeds(): Promise<void> {
    const feeds = await this.feedRepository.getFeedsDueForUpdate();
    logger.info({ feedCount: feeds.length }, 'Updating feeds');

    for (const feed of feeds) {
      try {
        await this.updateFeed(feed);
      } catch (error) {
        logger.error({ error, feedId: feed.id }, 'Error updating feed');
      }
    }
  }

  private async updateFeed(feedConfig: RSSFeedConfig): Promise<void> {
    try {
      const feedInfo = await this.rssParser.parseFeed(feedConfig.feedUrl);
      
      // Save feed metadata
      await this.feedRepository.updateFeedMetadata(feedConfig.id, {
        title: feedInfo.title,
        description: feedInfo.description,
        url: feedInfo.url
      });

      // Save feed items
      if (feedInfo.items) {
        const localItems: LocalFeedItem[] = feedInfo.items.map(item => ({
          feed_config_id: feedConfig.id,
          guid: item.guid,
          title: item.title,
          url: item.url,
          description: item.description,
          content: item.description, // Use description as content since FeedItem doesn't have content
          author: '', // FeedItem doesn't have author
          categories: [], // FeedItem doesn't have categories
          published_at: new Date(item.pubDate)
        }));

        await this.feedRepository.saveFeedItems(feedConfig.id, localItems);
      }

      // Update feed health to indicate successful fetch
      const healthUpdate: FeedHealthUpdate = {
        errorCount: 0,
        lastError: '',
        errorCategory: 'UNKNOWN_ERROR', // Default value since we need a non-null value
        isPermanentlyInvalid: false
      };
      await this.feedRepository.updateFeedHealth(feedConfig.id, healthUpdate);

    } catch (error) {
      let healthUpdate: FeedHealthUpdate;

      if (error instanceof RSSFetchError) {
        healthUpdate = {
          errorCount: 1,
          lastError: error.message,
          errorCategory: error.errorCategory,
          isPermanentlyInvalid: error.isPermanentlyInvalid
        };
      } else {
        healthUpdate = {
          errorCount: 1,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          errorCategory: 'UNKNOWN_ERROR',
          isPermanentlyInvalid: false
        };
      }

      await this.feedRepository.updateFeedHealth(feedConfig.id, healthUpdate);
      throw error;
    }
  }
} 